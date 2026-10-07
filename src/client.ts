import * as dotenv from "dotenv";
import type {
  ObjectType,
  WhereCondition,
  SearchOptions,
  SearchQuery,
  SearchResponse,
  SearchResultSet,
  CreatePersonInput,
  CreateOrganizationInput,
  CreateOpportunityInput,
  SendNotificationInput,
} from "./types";

// Load environment variables
dotenv.config();

export interface DayAIConfig {
  baseUrl?: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** @deprecated Ignored. The workspace is chosen when the user authorizes. */
  workspaceId?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

// JSON-RPC 2.0 Types for MCP
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

export interface McpToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Read a JSON-RPC response body, which may arrive as plain JSON or as a
 * Server-Sent Events stream.
 *
 * The Day AI MCP endpoint answers with `text/event-stream` when the client
 * advertises that it accepts one, emitting `: keepalive` comments while a slow
 * tool runs so intermediaries do not drop the connection. The SDK issues one
 * request per call and wants one result, so the whole body is read and the
 * JSON-RPC message extracted; keepalive comments are discarded.
 *
 * This SDK does not currently send an `Accept` header, so responses are plain
 * JSON today. The SSE branch exists so that adding one — which the MCP spec
 * requires of clients — cannot silently break every call.
 */
export function parseJsonRpcBody(
  contentType: string | null,
  body: string,
  requestId?: string | number | null
): JsonRpcResponse {
  if (!contentType?.includes('text/event-stream')) {
    return JSON.parse(body) as JsonRpcResponse;
  }

  // SSE frames are separated by a blank line. Within a frame, `data:` lines
  // carry the payload and a leading `:` marks a comment (our keepalives).
  const messages = body
    .split('\n\n')
    .map((frame) =>
      frame
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice('data:'.length).trim())
        .join('\n')
    )
    .filter((payload) => payload.length > 0)
    .map((payload) => JSON.parse(payload) as JsonRpcResponse);

  if (messages.length === 0) {
    throw new Error('MCP stream closed without a JSON-RPC message');
  }

  // A stream may carry more than one message. Prefer the one answering this
  // request; fall back to the last, which is the result in practice.
  const answer =
    requestId === undefined
      ? undefined
      : messages.find((message) => message.id === requestId);

  return answer ?? messages[messages.length - 1];
}

export class DayAIClient {
  private config: DayAIConfig;
  private currentAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private mcpInitialized: boolean = false;
  private readOnlyTools: Set<string> | null = null;

  constructor(config?: Partial<DayAIConfig>) {
    // Load from environment variables with config overrides
    this.config = {
      baseUrl:
        config?.baseUrl || process.env.DAY_AI_BASE_URL || "https://day.ai",
      clientId: config?.clientId || process.env.CLIENT_ID || "",
      clientSecret: config?.clientSecret || process.env.CLIENT_SECRET || "",
      refreshToken: config?.refreshToken || process.env.REFRESH_TOKEN || "",
      workspaceId: config?.workspaceId || process.env.WORKSPACE_ID,
    };

    if (
      !this.config.clientId ||
      !this.config.clientSecret ||
      !this.config.refreshToken
    ) {
      throw new Error(
        'Missing required OAuth credentials. Please run "npm run oauth:setup" or provide clientId, clientSecret, and refreshToken.'
      );
    }
  }

  /**
   * The Day AI MCP server URL, for MCP clients that connect directly
   * (Anthropic's MCP connector, the Claude Agent SDK, etc.).
   */
  get mcpUrl(): string {
    return `${this.config.baseUrl}/api/mcp`;
  }

  /**
   * Get a valid access token, refreshing it if needed. Access tokens last
   * about an hour; pass the result to MCP clients as a bearer token.
   */
  async getAccessToken(): Promise<string> {
    // Check if current token is still valid (with 60 second buffer)
    const now = Date.now() / 1000;
    if (this.currentAccessToken && this.tokenExpiresAt > now + 60) {
      return this.currentAccessToken;
    }

    console.log("🔄 Refreshing access token...");

    const payload = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
    });

    const response = await fetch(`${this.config.baseUrl}/api/oauth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to refresh token: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const tokenData = (await response.json()) as TokenResponse;

    this.currentAccessToken = tokenData.access_token;
    this.tokenExpiresAt = now + tokenData.expires_in;

    console.log("✅ Access token refreshed");
    return this.currentAccessToken;
  }

  /**
   * Make an authenticated request to the Day AI API
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const accessToken = await this.getAccessToken();

      const url = `${this.config.baseUrl}${endpoint}`;
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = (await response.json()) as T;

      if (!response.ok) {
        return {
          success: false,
          error:
            (data as any).error ||
            `HTTP ${response.status}: ${response.statusText}`,
          data,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Make a GraphQL request.
   *
   * @deprecated Day AI's GraphQL API doesn't accept integration (OAuth) tokens.
   * Use the MCP tools via `mcpCallTool()` instead.
   */
  async graphql<T = any>(
    query: string,
    variables?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    return this.request<T>("/api/graphql", {
      method: "POST",
      body: JSON.stringify({
        query,
        variables,
      }),
    });
  }

  /**
   * Get workspace metadata
   */
  async getWorkspaceMetadata(): Promise<ApiResponse> {
    const accessToken = await this.getAccessToken();

    return this.request("/api/oauth", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "metadata",
      }).toString(),
    });
  }

  /**
   * Test the connection and get basic info
   */
  async testConnection(): Promise<ApiResponse> {
    try {
      console.log("🧪 Testing connection...");

      const metadata = await this.getWorkspaceMetadata();
      if (!metadata.success) {
        return metadata;
      }
      // The metadata endpoint reports a bad token in the body, not the status.
      if (metadata.data?.authError || !metadata.data?.workspaceId) {
        return {
          success: false,
          error: `Authentication failed: ${metadata.data?.authError ?? 'no workspace returned'}`,
          data: metadata.data,
        };
      }

      console.log("✅ Connection successful!");
      console.log(`   Workspace: ${metadata.data.workspaceName}`);
      console.log(`   Workspace ID: ${metadata.data.workspaceId}`);
      console.log(`   User ID: ${metadata.data.userId}`);

      return {
        success: true,
        data: {
          message: "Connection successful",
          workspace: metadata.data,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }

  /**
   * Make a JSON-RPC 2.0 request to the MCP endpoint, retrying transient
   * server errors when it's safe to.
   *
   * 503 means the request wasn't processed, so it's always retried. A 502 or
   * 504 can arrive after the server finished the work, so tool calls are only
   * retried for tools the server marks read-only.
   */
  private async mcpRequest(
    method: string,
    params?: any
  ): Promise<ApiResponse<any>> {
    const maxAttempts = 3;
    for (let attempt = 1; ; attempt++) {
      const { result, status, retryAfterSeconds } = await this.mcpRequestOnce(method, params);
      const transient = status === 502 || status === 503 || status === 504;
      if (!transient || attempt >= maxAttempts) {
        return result;
      }
      if (status !== 503 && method === 'tools/call' && !(await this.isReadOnlyTool(params?.name))) {
        return result;
      }
      const delaySeconds = retryAfterSeconds ?? attempt;
      await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
    }
  }

  private async isReadOnlyTool(toolName: string | undefined): Promise<boolean> {
    if (!toolName) return false;
    if (!this.readOnlyTools) {
      const list = await this.mcpRequestOnce('tools/list');
      if (!list.result.success) return false;
      const tools: McpTool[] = list.result.data?.tools ?? [];
      this.readOnlyTools = new Set(
        tools.filter((tool) => tool.annotations?.readOnlyHint).map((tool) => tool.name)
      );
    }
    return this.readOnlyTools.has(toolName);
  }

  private async mcpRequestOnce(
    method: string,
    params?: any
  ): Promise<{ result: ApiResponse<any>; status?: number; retryAfterSeconds?: number }> {
    try {
      const accessToken = await this.getAccessToken();

      const jsonRpcRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      };

      const response = await fetch(this.mcpUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify(jsonRpcRequest),
      });

      // Read the body once, then parse. Parsing before checking `response.ok`
      // meant a non-JSON error body (an HTML 502 from a proxy, say) threw and
      // was reported as a parse failure instead of the HTTP status.
      const rawBody = await response.text();

      let jsonRpcResponse: JsonRpcResponse | undefined;
      let parseError: string | undefined;
      try {
        jsonRpcResponse = parseJsonRpcBody(
          response.headers.get('content-type'),
          rawBody,
          jsonRpcRequest.id
        );
      } catch (error) {
        parseError =
          error instanceof Error ? error.message : 'Unparseable response body';
      }

      if (!response.ok) {
        const retryAfter = Number(response.headers.get('retry-after'));
        return {
          status: response.status,
          retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
          result: {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
            data: jsonRpcResponse,
          },
        };
      }

      if (!jsonRpcResponse) {
        return {
          status: response.status,
          result: {
            success: false,
            error: `Invalid MCP response: ${parseError}`,
          },
        };
      }

      if (jsonRpcResponse.error) {
        return {
          status: response.status,
          result: {
            success: false,
            error: `JSON-RPC Error ${jsonRpcResponse.error.code}: ${jsonRpcResponse.error.message}`,
            data: jsonRpcResponse.error,
          },
        };
      }

      return {
        status: response.status,
        result: {
          success: true,
          data: jsonRpcResponse.result,
        },
      };
    } catch (error) {
      return {
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'MCP request failed',
        },
      };
    }
  }

  /**
   * Initialize the MCP connection
   */
  async mcpInitialize(): Promise<ApiResponse> {
    const result = await this.mcpRequest('initialize', {
      protocolVersion: '2025-06-18',
      clientInfo: {
        name: 'Day AI SDK',
        version: '0.1.0',
      },
      capabilities: {
        tools: {},
        resources: {},
      },
    });

    if (result.success) {
      this.mcpInitialized = true;
      console.log('✅ MCP initialized');
    }

    return result;
  }

  /**
   * List available tools via MCP
   */
  async mcpListTools(): Promise<ApiResponse<{ tools: McpTool[] }>> {
    if (!this.mcpInitialized) {
      const initResult = await this.mcpInitialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    return this.mcpRequest('tools/list');
  }

  /**
   * Call a tool via MCP
   */
  async mcpCallTool(
    toolName: string,
    args: Record<string, any> = {}
  ): Promise<ApiResponse<McpToolResult>> {
    if (!this.mcpInitialized) {
      const initResult = await this.mcpInitialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    return this.mcpRequest('tools/call', {
      name: toolName,
      arguments: args,
    });
  }

  // ---------------------------------------------------------------------------
  // Convenience methods — typed wrappers around mcpCallTool
  // ---------------------------------------------------------------------------

  /**
   * Parse the JSON text from an MCP tool result.
   * Returns the parsed object, or throws if the tool returned an error.
   */
  private parseMcpResult<T = any>(response: ApiResponse<McpToolResult>): T {
    if (!response.success) {
      throw new Error(response.error ?? 'MCP call failed');
    }
    if (response.data?.isError) {
      throw new Error(response.data.content[0]?.text ?? 'MCP tool error');
    }
    const text = response.data?.content[0]?.text;
    if (!text) {
      throw new Error('Empty MCP tool response');
    }
    // Most tools return JSON, but some return plain text.
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  /**
   * Search for objects by type, with optional filters.
   * Returns parsed, typed results.
   *
   * @example
   * const results = await client.search('native_contact', {
   *   propertyId: 'email', operator: 'contains', value: '@acme.com'
   * });
   */
  async search(
    objectType: ObjectType | string,
    where?: WhereCondition,
    options?: SearchOptions,
  ): Promise<SearchResponse> {
    const raw = await this.mcpCallTool('search_objects', {
      ...options,
      queries: [{ objectType, ...(where ? { where } : {}) }],
    });
    return this.parseMcpResult<SearchResponse>(raw);
  }

  /**
   * Search with multiple queries (raw MCP result for full control).
   * This is the method used by mcp-tool-example.ts.
   */
  async searchObjects(
    queries: SearchQuery[],
    options?: SearchOptions,
  ): Promise<ApiResponse<McpToolResult>> {
    return this.mcpCallTool('search_objects', {
      ...options,
      queries,
    });
  }

  /**
   * Find meetings by attendee email (contact) or domain (organization).
   *
   * Looks up the contact or organization first, then searches meetings by its
   * objectId. Returns an empty result if no single match is found.
   */
  async findMeetingsByAttendee(
    emailOrDomain: string,
    options?: SearchOptions,
  ): Promise<ApiResponse<McpToolResult>> {
    const isOrg = !emailOrDomain.includes('@');
    const targetObjectType = isOrg ? 'native_organization' : 'native_contact';
    const lookup = await this.search(targetObjectType, {
      propertyId: isOrg ? 'domain' : 'email',
      operator: 'eq',
      value: emailOrDomain,
    });
    const matches = (lookup[targetObjectType] as SearchResultSet | undefined)?.results ?? [];
    if (matches.length !== 1) {
      return {
        success: true,
        data: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                note: `Found ${matches.length} ${targetObjectType} records for ${emailOrDomain}; expected exactly one.`,
                candidates: matches.map((m) => ({ objectId: m.objectId, title: m.title })),
              }),
            },
          ],
        },
      };
    }

    return this.mcpCallTool('search_objects', {
      ...options,
      queries: [
        {
          objectType: 'native_meetingrecording',
          where: {
            relationship: 'attendee',
            targetObjectType,
            targetObjectId: matches[0].objectId,
            operator: 'eq',
          },
        },
      ],
    });
  }

  /**
   * Create or update a person (contact).
   */
  async createPerson(input: CreatePersonInput): Promise<any> {
    const { customProperties, ...standardProperties } = input;
    const raw = await this.mcpCallTool('create_or_update_person_organization', {
      objectType: 'native_contact',
      standardProperties,
      ...(customProperties ? { customProperties } : {}),
    });
    return this.parseMcpResult(raw);
  }

  /**
   * Create or update an organization.
   */
  async createOrganization(input: CreateOrganizationInput): Promise<any> {
    const { customProperties, ...standardProperties } = input;
    const raw = await this.mcpCallTool('create_or_update_person_organization', {
      objectType: 'native_organization',
      standardProperties,
      ...(customProperties ? { customProperties } : {}),
    });
    return this.parseMcpResult(raw);
  }

  /**
   * Create or update an opportunity.
   */
  async createOpportunity(input: CreateOpportunityInput): Promise<any> {
    const { customProperties, ...standardProperties } = input;
    const raw = await this.mcpCallTool('create_or_update_opportunity', {
      isCreating: true,
      standardProperties,
      ...(customProperties ? { customProperties } : {}),
    });
    return this.parseMcpResult(raw);
  }

  /**
   * Send a notification to the current user by email, Slack DM, or both, or
   * post to a Slack channel.
   *
   * Uses the `send_notification_mcp` tool, which is only available on some
   * Day AI plans. Check `mcpListTools()` if this fails with a tier error.
   */
  async sendNotification(input: SendNotificationInput): Promise<any> {
    const raw = await this.mcpCallTool('send_notification_mcp', input);
    return this.parseMcpResult(raw);
  }

}

export default DayAIClient;
