// Day AI Client - Simplified for mobile (no dotenv dependency)

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

  constructor(config: DayAIConfig) {
    this.config = {
      baseUrl: config.baseUrl || "https://day.ai",
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
      workspaceId: config.workspaceId,
    };

    if (
      !this.config.clientId ||
      !this.config.clientSecret ||
      !this.config.refreshToken
    ) {
      throw new Error(
        'Missing required OAuth credentials. Please provide clientId, clientSecret, and refreshToken.'
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

    console.log("[DayAIClient] Refreshing access token...");

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

    console.log("[DayAIClient] Access token refreshed");
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
      console.log("[DayAIClient] Testing connection...");

      const metadata = await this.getWorkspaceMetadata();
      if (!metadata.success) {
        return metadata;
      }

      console.log("[DayAIClient] Connection successful!");
      console.log(`   Workspace: ${metadata.data.workspaceName}`);
      console.log(`   User: ${metadata.data.user?.email || metadata.data.userId}`);

      return {
        success: true,
        data: {
          message: "Connection successful",
          workspace: {
            id: metadata.data.workspaceId,
            name: metadata.data.workspaceName,
          },
          user: {
            email: metadata.data.user?.email || metadata.data.userId,
            name: metadata.data.user?.name,
          },
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
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          data: jsonRpcResponse,
        };
      }

      if (!jsonRpcResponse) {
        return {
          success: false,
          error: `Invalid MCP response: ${parseError}`,
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
        name: 'Day AI Mobile',
        version: '1.0.0',
      },
      capabilities: {
        tools: {},
        resources: {},
      },
    });

    if (result.success) {
      this.mcpInitialized = true;
      console.log('[DayAIClient] MCP initialized');
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
}

export default DayAIClient;
