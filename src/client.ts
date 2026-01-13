import * as dotenv from "dotenv";

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

}

export default DayAIClient;
