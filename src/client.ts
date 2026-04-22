import * as dotenv from "dotenv";
import type {
  ObjectType,
  WhereCondition,
  SearchOptions,
  SearchQuery,
  SearchResponse,
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
}

export interface McpToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

export class DayAIClient {
  private config: DayAIConfig;
  private currentAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private mcpInitialized: boolean = false;

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
   * Get a fresh access token by refreshing if needed
   */
  private async getAccessToken(): Promise<string> {
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
   * Make a GraphQL request
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
   * Make a JSON-RPC 2.0 request to the MCP endpoint
   */
  private async mcpRequest(
    method: string,
    params?: any
  ): Promise<ApiResponse<any>> {
    try {
      const accessToken = await this.getAccessToken();

      const jsonRpcRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      };

      const response = await fetch(`${this.config.baseUrl}/api/mcp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonRpcRequest),
      });

      const jsonRpcResponse = await response.json() as JsonRpcResponse;

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          data: jsonRpcResponse,
        };
      }

      if (jsonRpcResponse.error) {
        return {
          success: false,
          error: `JSON-RPC Error ${jsonRpcResponse.error.code}: ${jsonRpcResponse.error.message}`,
          data: jsonRpcResponse.error,
        };
      }

      return {
        success: true,
        data: jsonRpcResponse.result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MCP request failed',
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
    return JSON.parse(text) as T;
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
   */
  async findMeetingsByAttendee(
    emailOrDomain: string,
    options?: SearchOptions,
  ): Promise<ApiResponse<McpToolResult>> {
    const isOrg = !emailOrDomain.includes('@');
    return this.mcpCallTool('search_objects', {
      ...options,
      queries: [
        {
          objectType: 'native_meetingrecording',
          where: {
            relationship: 'attendee',
            targetObjectType: isOrg ? 'native_organization' : 'native_contact',
            targetObjectId: emailOrDomain,
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
      isCreating: true,
      objectType: 'Person',
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
      isCreating: true,
      objectType: 'Organization',
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
   * Send a notification via email, Slack, or both.
   */
  async sendNotification(input: SendNotificationInput): Promise<any> {
    const raw = await this.mcpCallTool('send_notification_mcp', input);
    return this.parseMcpResult(raw);
  }

}

export default DayAIClient;
