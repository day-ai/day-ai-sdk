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

  // Chat API
  chat: {
    sendMessage: (noteId: string, message: string): Promise<AgentResponse> =>
      ipcRenderer.invoke('chat-send-message', noteId, message),
    executeToolAndContinue: (
      noteId: string,
      toolCall: ToolCall
    ): Promise<{ toolResult: ToolResult; response: AgentResponse }> =>
      ipcRenderer.invoke('chat-execute-tool-and-continue', noteId, toolCall),
    getHistory: (noteId: string): Promise<ChatMessage[]> =>
      ipcRenderer.invoke('chat-get-history', noteId),
    saveMessage: (noteId: string, message: ChatMessage): Promise<void> =>
      ipcRenderer.invoke('chat-save-message', noteId, message),
    clearHistory: (noteId: string): Promise<void> =>
      ipcRenderer.invoke('chat-clear-history', noteId),
    abort: (): Promise<void> => ipcRenderer.invoke('chat-abort'),
    onStreamChunk: (callback: (chunk: StreamChunk) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, chunk: StreamChunk) => callback(chunk)
      ipcRenderer.on('chat-stream-chunk', handler)
      return () => ipcRenderer.removeListener('chat-stream-chunk', handler)
    },
    onStreamEnd: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on('chat-stream-end', handler)
      return () => ipcRenderer.removeListener('chat-stream-end', handler)
    },
    onStreamError: (callback: (error: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
      ipcRenderer.on('chat-stream-error', handler)
      return () => ipcRenderer.removeListener('chat-stream-error', handler)
    },
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
