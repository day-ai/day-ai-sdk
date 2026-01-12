// Note types
export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

// Config types
export interface AppConfig {
  anthropicApiKey?: string
  mcpServers?: MCPServerConfig[]
}

// Chat types
export interface ToolCall {
  id: string
  name: string
  parameters: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  toolName: string
  success: boolean
  result?: unknown
  error?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  thinking?: string
  toolCall?: ToolCall
  toolResult?: ToolResult
  isStreaming?: boolean
  isThinking?: boolean
}

export interface AgentResponse {
  thinking?: string
  content: string
  toolCall?: ToolCall
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens'
}

export interface StreamChunk {
  type: 'text' | 'thinking'
  content: string
}

// MCP types
export interface MCPOAuthTokens {
  clientId: string
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

export interface MCPServerConfig {
  id: string
  name: string
  baseUrl: string
  mcpEndpoint: string
  authEndpoint: string
  tokenEndpoint: string
  registrationEndpoint: string
  scopes: string[]
  connected: boolean
  oauth?: MCPOAuthTokens
}

export interface MCPTool {
  serverId: string
  name: string
  description: string
  inputSchema: Record<string, unknown>
}
