export { 
  DayAIClient, 
  type DayAIConfig, 
  type ApiResponse, 
  type TokenResponse,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type McpTool,
  type McpToolResult
} from './client';

// Re-export the client as default export
export { DayAIClient as default } from './client';