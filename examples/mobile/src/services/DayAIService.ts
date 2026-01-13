// Day AI Service - OAuth and MCP client for mobile
import { DayAIClient } from '../lib/DayAIClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAY_AI_STORAGE_KEY = '@day_ai_mobile:credentials';

export interface DayAICredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface ConnectionStatus {
  connected: boolean;
  workspace?: {
    id: string;
    name: string;
  };
  user?: {
    email: string;
    name?: string;
  };
}

export class DayAIService {
  private client: DayAIClient | null = null;
  private tools: any[] = [];
  private isInitialized: boolean = false;

  constructor() {
    this.loadCredentials();
  }

  /**
   * Load saved credentials from storage and initialize client
   */
  private async loadCredentials(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(DAY_AI_STORAGE_KEY);
      if (saved) {
        const credentials: DayAICredentials = JSON.parse(saved);
        await this.initializeClient(credentials);
      }
    } catch (error) {
      console.error('[DayAIService] Failed to load credentials:', error);
    }
  }

  /**
   * Initialize the Day AI client with credentials
   */
  private async initializeClient(credentials: DayAICredentials): Promise<void> {
    try {
      this.client = new DayAIClient({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        refreshToken: credentials.refreshToken,
      });

      // Initialize MCP connection
      await this.client.mcpInitialize();

      // Fetch available tools
      const toolsResponse = await this.client.mcpListTools();
      if (toolsResponse.success && toolsResponse.data?.tools) {
        this.tools = toolsResponse.data.tools;
        console.log('[DayAIService] Loaded', this.tools.length, 'MCP tools');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('[DayAIService] Failed to initialize client:', error);
      this.client = null;
      this.isInitialized = false;
    }
  }

  /**
   * Connect to Day AI with OAuth credentials
   * For Phase 2: Manual token entry
   * For Phase 3: Full OAuth flow with Expo AuthSession
   */
  async connect(credentials: DayAICredentials): Promise<ConnectionStatus> {
    try {
      // Save credentials
      await AsyncStorage.setItem(DAY_AI_STORAGE_KEY, JSON.stringify(credentials));

      // Initialize client
      await this.initializeClient(credentials);

      // Test connection
      const status = await this.getConnectionStatus();
      if (!status.connected) {
        throw new Error('Connection test failed');
      }

      return status;
    } catch (error) {
      console.error('[DayAIService] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Day AI
   */
  async disconnect(): Promise<void> {
    try {
      await AsyncStorage.removeItem(DAY_AI_STORAGE_KEY);
      this.client = null;
      this.tools = [];
      this.isInitialized = false;
    } catch (error) {
      console.error('[DayAIService] Disconnect failed:', error);
    }
  }

  /**
   * Check if connected to Day AI
   */
  isConnected(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Get current connection status
   */
  async getConnectionStatus(): Promise<ConnectionStatus> {
    if (!this.client) {
      return { connected: false };
    }

    try {
      const testResponse = await this.client.testConnection();
      if (testResponse.success && testResponse.data) {
        return {
          connected: true,
          workspace: {
            id: testResponse.data.workspace.workspaceId,
            name: testResponse.data.workspace.workspaceName,
          },
          user: {
            email: testResponse.data.user.email,
            name: testResponse.data.user.name,
          },
        };
      }
    } catch (error) {
      console.error('[DayAIService] Status check failed:', error);
    }

    return { connected: false };
  }

  /**
   * Get available MCP tools for Claude
   */
  getTools(): any[] {
    return this.tools;
  }

  /**
   * Execute an MCP tool call
   */
  async executeTool(toolName: string, toolInput: any): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected to Day AI');
    }

    try {
      console.log('[DayAIService] Executing tool:', toolName, 'with input:', toolInput);

      const response = await this.client.mcpCallTool(toolName, toolInput);

      if (!response.success) {
        throw new Error(response.error || 'Tool execution failed');
      }

      // Parse the tool response
      const content = response.data?.content?.[0];
      if (content?.type === 'text') {
        try {
          // Try to parse JSON response
          return JSON.parse(content.text);
        } catch {
          // Return raw text if not JSON
          return { result: content.text };
        }
      }

      return response.data;
    } catch (error) {
      console.error('[DayAIService] Tool execution failed:', error);
      throw error;
    }
  }

  /**
   * Format tool result for display
   */
  formatToolResult(toolName: string, result: any): string {
    try {
      // Handle search_objects results
      if (toolName === 'search_objects') {
        const resultKeys = Object.keys(result).filter(k => !['hasMore', 'nextOffset'].includes(k));
        if (resultKeys.length === 0) return 'No results found';

        const summary: string[] = [];
        for (const key of resultKeys) {
          const data = result[key];
          if (data?.results && Array.isArray(data.results)) {
            summary.push(`${data.results.length} ${key.replace('native_', '')}(s)`);
          }
        }
        return summary.join(', ') || 'Results retrieved';
      }

      // Handle keyword_search results
      if (toolName === 'keyword_search') {
        const resultKeys = Object.keys(result).filter(k => k.startsWith('native_'));
        if (resultKeys.length === 0) return 'No results found';

        const summary: string[] = [];
        for (const key of resultKeys) {
          const data = result[key];
          if (data?.results && Array.isArray(data.results)) {
            summary.push(`${data.results.length} ${key.replace('native_', '')}(s)`);
          }
        }
        return summary.join(', ') || 'Results retrieved';
      }

      // Handle get_context_for_objects
      if (toolName === 'get_context_for_objects') {
        return 'Context retrieved';
      }

      // Handle create/update operations
      if (toolName.includes('create') || toolName.includes('update')) {
        return 'Operation completed successfully';
      }

      // Default: try to summarize
      if (typeof result === 'object') {
        const keys = Object.keys(result);
        if (keys.length > 0) {
          return `Retrieved ${keys.length} field(s)`;
        }
      }

      return 'Success';
    } catch {
      return 'Tool executed';
    }
  }
}

export const dayAIService = new DayAIService();
