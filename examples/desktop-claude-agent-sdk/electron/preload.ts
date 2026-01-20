import { contextBridge, ipcRenderer } from 'electron'

export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface AppConfig {
  anthropicApiKey?: string
  claudeCodePath?: string
}

// Tool types
export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  toolName: string
  success: boolean
  result?: unknown
  error?: string
}

// Chat message type for storage
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

// SDK Message Types
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

const api = {
  // Notes API
  getNotes: (): Promise<Note[]> => ipcRenderer.invoke('get-notes'),
  getNote: (id: string): Promise<Note | null> => ipcRenderer.invoke('get-note', id),
  createNote: (): Promise<Note> => ipcRenderer.invoke('create-note'),
  updateNote: (id: string, updates: Partial<Note>): Promise<Note | null> =>
    ipcRenderer.invoke('update-note', id, updates),
  deleteNote: (id: string): Promise<boolean> => ipcRenderer.invoke('delete-note', id),

  // Platform API
  getPlatform: (): Promise<'darwin' | 'win32' | 'linux'> => ipcRenderer.invoke('get-platform'),
  getIsFullscreen: (): Promise<boolean> => ipcRenderer.invoke('get-is-fullscreen'),
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isFullscreen: boolean) => callback(isFullscreen)
    ipcRenderer.on('fullscreen-change', handler)
    return () => ipcRenderer.removeListener('fullscreen-change', handler)
  },

  // Config API
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('get-config'),
  setConfig: (config: Partial<AppConfig>): Promise<AppConfig> =>
    ipcRenderer.invoke('set-config', config),
  detectClaudePath: (): Promise<string | null> => ipcRenderer.invoke('detect-claude-path'),

  // Chat API
  chat: {
    sendMessage: (noteId: string, message: string): Promise<void> =>
      ipcRenderer.invoke('chat-send-message', noteId, message),
    getHistory: (noteId: string): Promise<{ messages: ChatMessage[]; sessionId?: string }> =>
      ipcRenderer.invoke('chat-get-history', noteId),
    saveMessage: (noteId: string, message: ChatMessage): Promise<void> =>
      ipcRenderer.invoke('chat-save-message', noteId, message),
    clearHistory: (noteId: string): Promise<void> =>
      ipcRenderer.invoke('chat-clear-history', noteId),
    abort: (): Promise<void> => ipcRenderer.invoke('chat-abort'),
    // New SDK-style message handler
    onAgentMessage: (callback: (msg: AgentIPCMessage) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, msg: AgentIPCMessage) => callback(msg)
      ipcRenderer.on('agent-message', handler)
      return () => ipcRenderer.removeListener('agent-message', handler)
    },
    // Note update notifications (triggered by tool execution)
    onNoteUpdated: (callback: (noteId: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, noteId: string) => callback(noteId)
      ipcRenderer.on('note-updated', handler)
      return () => ipcRenderer.removeListener('note-updated', handler)
    },
    onNotesChanged: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on('notes-changed', handler)
      return () => ipcRenderer.removeListener('notes-changed', handler)
    },
  },

  // MCP API
  mcp: {
    getServers: (): Promise<MCPServerConfig[]> => ipcRenderer.invoke('mcp-get-servers'),
    connect: (serverId: string): Promise<MCPTool[]> => ipcRenderer.invoke('mcp-connect', serverId),
    disconnect: (serverId: string): Promise<void> => ipcRenderer.invoke('mcp-disconnect', serverId),
    listTools: (): Promise<MCPTool[]> => ipcRenderer.invoke('mcp-list-tools'),
    callTool: (serverId: string, toolName: string, args: Record<string, unknown>): Promise<unknown> =>
      ipcRenderer.invoke('mcp-call-tool', serverId, toolName, args),
  },
}

contextBridge.exposeInMainWorld('dayai', api)

// Type declaration for renderer process
declare global {
  interface Window {
    dayai: typeof api
  }
}
