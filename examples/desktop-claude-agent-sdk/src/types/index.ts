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
  claudeCodePath?: string
  mcpServers?: MCPServerConfig[]
}

// Chat types
export interface ToolCall {
  id: string
  name: string
  title?: string
  input: Record<string, unknown>
  icon?: MCPToolIcon
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
  timestamp: number
  thinking?: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  isStreaming?: boolean
  isThinking?: boolean
}

// SDK Message Types - from Claude Agent SDK
export type SDKMessageType = 'system' | 'assistant' | 'user' | 'result'

export interface SDKContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking'
  text?: string
  thinking?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string | Array<{ type: string; text?: string }>
  is_error?: boolean
}

export interface SDKMessage {
  type: SDKMessageType
  session_id?: string
  message?: {
    role: string
    content: SDKContentBlock[]
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    }
  }
  subtype?: string
  result?: string
  duration_ms?: number
  total_cost_usd?: number
  is_error?: boolean
}

// IPC Message wrapper for renderer
export interface AgentIPCMessage {
  type: 'session-created' | 'agent-message' | 'agent-complete' | 'agent-error' | 'token-budget'
  noteId?: string
  sessionId?: string
  data?: SDKMessage
  error?: string
  tokenBudget?: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheCreationTokens: number
    totalTokens: number
  }
}

// Legacy types for backwards compatibility
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

export interface MCPToolIcon {
  // Emoji icon type
  type?: 'emoji' | 'url' | 'data-uri'
  value?: string
  // Standard MCP icon properties
  src?: string
  mimeType?: string
  sizes?: string[]
  theme?: 'light' | 'dark'
}

export interface MCPTool {
  serverId: string
  name: string
  title?: string
  description: string
  inputSchema: Record<string, unknown>
  icons?: MCPToolIcon[]
}
