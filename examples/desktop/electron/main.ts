import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { config as dotenvConfig } from 'dotenv'
import { v4 as uuidv4 } from 'uuid'

// Load .env from project root
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenvConfig({ path: path.join(__dirname, '..', '.env') })

import { AgentService, ChatMessage, NoteContext, StreamChunk } from './services/AgentService'
import { executeToolCall } from './services/ToolExecutor'
import * as OAuthService from './services/OAuthService'
import { OAUTH_REDIRECT_URI } from './services/OAuthService'
import * as MCPClientService from './services/MCPClientService'

let mainWindow: BrowserWindow | null = null
let agentService: AgentService | null = null

// App data paths
const APP_DATA_DIR = path.join(app.getPath('appData'), 'DayAIDemo')
const NOTES_PATH = path.join(APP_DATA_DIR, 'notes.json')
const CONFIG_PATH = path.join(APP_DATA_DIR, 'config.json')
const CHATS_DIR = path.join(APP_DATA_DIR, 'chats')

// MCP OAuth tokens
interface MCPOAuthTokens {
  clientId: string
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

// MCP server configuration
interface MCPServerConfig {
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

// Config type
interface AppConfig {
  anthropicApiKey?: string
  mcpServers?: MCPServerConfig[]
}

// Day.ai MCP server configuration
const DAY_AI_CONFIG: Omit<MCPServerConfig, 'connected' | 'oauth'> = {
  id: 'day-ai',
  name: 'Day.ai',
  baseUrl: 'https://day.ai',
  mcpEndpoint: 'https://day.ai/api/mcp',
  authEndpoint: 'https://day.ai/integrations/authorize',
  tokenEndpoint: 'https://day.ai/api/oauth',
  registrationEndpoint: 'https://day.ai/api/oauth/register',
  scopes: ['native_organization:write', 'native_contact:write', 'assistant:*:use'],
}

// Ensure app data directory exists
function ensureAppDataDir() {
  if (!fs.existsSync(APP_DATA_DIR)) {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(CHATS_DIR)) {
    fs.mkdirSync(CHATS_DIR, { recursive: true })
  }
}

// Load config from file, with environment variables taking precedence
function loadConfig(): AppConfig {
  ensureAppDataDir()
  let config: AppConfig = {}
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8')
      config = JSON.parse(data)
    } catch {
      config = {}
    }
  }

  // Environment variables take precedence for API keys
  if (process.env.ANTHROPIC_API_KEY) {
    config.anthropicApiKey = process.env.ANTHROPIC_API_KEY
  }

  return config
}

// Save config to file
function saveConfig(config: AppConfig) {
  ensureAppDataDir()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

// Note types
interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

interface NotesData {
  notes: Note[]
}

// Load notes from file
function loadNotes(): NotesData {
  ensureAppDataDir()
  if (fs.existsSync(NOTES_PATH)) {
    try {
      const data = fs.readFileSync(NOTES_PATH, 'utf-8')
      return JSON.parse(data)
    } catch {
      return { notes: [] }
    }
  }
  return { notes: [] }
}

// Save notes to file
function saveNotes(data: NotesData) {
  ensureAppDataDir()
  fs.writeFileSync(NOTES_PATH, JSON.stringify(data, null, 2))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Load dev server or built files
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Fullscreen state events
  mainWindow.on('enter-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fullscreen-change', true)
    }
  })

  mainWindow.on('leave-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fullscreen-change', false)
    }
  })
}

// IPC Handlers - Notes
ipcMain.handle('get-notes', async () => {
  const data = loadNotes()
  return data.notes
})

ipcMain.handle('get-note', async (_event, id: string) => {
  const data = loadNotes()
  return data.notes.find((note) => note.id === id) || null
})

ipcMain.handle('create-note', async () => {
  const data = loadNotes()
  const now = new Date().toISOString()
  const newNote: Note = {
    id: uuidv4(),
    title: 'Untitled',
    content: '',
    createdAt: now,
    updatedAt: now,
  }
  data.notes.unshift(newNote)
  saveNotes(data)
  return newNote
})

ipcMain.handle('update-note', async (_event, id: string, updates: Partial<Note>) => {
  const data = loadNotes()
  const index = data.notes.findIndex((note) => note.id === id)
  if (index !== -1) {
    data.notes[index] = {
      ...data.notes[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    saveNotes(data)
    return data.notes[index]
  }
  return null
})

ipcMain.handle('delete-note', async (_event, id: string) => {
  const data = loadNotes()
  data.notes = data.notes.filter((note) => note.id !== id)
  saveNotes(data)
  return true
})

// IPC Handlers - Platform & Config
ipcMain.handle('get-platform', async () => {
  return process.platform
})

ipcMain.handle('get-is-fullscreen', async () => {
  return mainWindow?.isFullScreen() ?? false
})

ipcMain.handle('get-config', async () => {
  return loadConfig()
})

ipcMain.handle('set-config', async (_event, config: AppConfig) => {
  const currentConfig = loadConfig()
  const newConfig = { ...currentConfig, ...config }
  saveConfig(newConfig)
  return newConfig
})

// Chat types for storage
interface StoredChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  thinking?: string
  toolCall?: {
    id: string
    name: string
    parameters: Record<string, unknown>
  }
  toolResult?: {
    toolCallId: string
    toolName: string
    success: boolean
    result?: unknown
    error?: string
  }
}

interface ChatHistory {
  noteId: string
  messages: StoredChatMessage[]
  updatedAt: string
}

// Chat history functions
function getChatHistoryPath(noteId: string): string {
  return path.join(CHATS_DIR, `${noteId}.json`)
}

function loadChatHistory(noteId: string): StoredChatMessage[] {
  ensureAppDataDir()
  const chatPath = getChatHistoryPath(noteId)
  if (fs.existsSync(chatPath)) {
    try {
      const data = fs.readFileSync(chatPath, 'utf-8')
      const history: ChatHistory = JSON.parse(data)
      return history.messages
    } catch {
      return []
    }
  }
  return []
}

function saveChatHistory(noteId: string, messages: StoredChatMessage[]) {
  ensureAppDataDir()
  const chatPath = getChatHistoryPath(noteId)
  const history: ChatHistory = {
    noteId,
    messages,
    updatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(chatPath, JSON.stringify(history, null, 2))
}

function stripHtmlForContext(html: string | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getAgentService(): AgentService {
  const config = loadConfig()
  if (!config.anthropicApiKey) {
    throw new Error('Anthropic API key not configured')
  }
  if (!agentService) {
    agentService = new AgentService(config.anthropicApiKey)
  }
  return agentService
}

function buildNoteContext(noteId: string): NoteContext {
  const data = loadNotes()
  const note = data.notes.find((n) => n.id === noteId)
  if (!note) {
    throw new Error('Note not found')
  }
  return {
    noteId: note.id,
    noteTitle: note.title,
    noteContent: note.content,
    noteContentPlainText: stripHtmlForContext(note.content),
  }
}

// Chat IPC Handlers
ipcMain.handle('chat-get-history', async (_event, noteId: string) => {
  return loadChatHistory(noteId)
})

ipcMain.handle('chat-save-message', async (_event, noteId: string, message: StoredChatMessage) => {
  const messages = loadChatHistory(noteId)
  const existingIndex = messages.findIndex((m) => m.id === message.id)
  if (existingIndex >= 0) {
    messages[existingIndex] = message
  } else {
    messages.push(message)
  }
  saveChatHistory(noteId, messages)
})

ipcMain.handle('chat-clear-history', async (_event, noteId: string) => {
  saveChatHistory(noteId, [])
})

ipcMain.handle('chat-send-message', async (_event, noteId: string, message: string) => {
  try {
    const agent = getAgentService()
    const context = buildNoteContext(noteId)
    const history = loadChatHistory(noteId)

    // Convert stored messages to agent format
    const agentHistory: ChatMessage[] = history.map((m) => ({
      role: m.role,
      content: m.content,
      toolCall: m.toolCall,
      toolResult: m.toolResult,
    }))

    const response = await agent.chat(message, context, agentHistory, (chunk: StreamChunk) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('chat-stream-chunk', chunk)
      }
    })

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('chat-stream-end')
    }

    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('chat-stream-error', errorMessage)
    }
    throw error
  }
})

ipcMain.handle('chat-execute-tool-and-continue', async (_event, noteId: string, toolCall: { id: string; name: string; parameters: Record<string, unknown> }) => {
  try {
    // Execute the tool
    const toolResult = await executeToolCall(toolCall, noteId)

    // Notify about note update if the tool was update_note
    if (toolCall.name === 'update_note' && toolResult.success) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('note-updated', noteId)
      }
    }

    // Notify about new note creation
    if (toolCall.name === 'create_note' && toolResult.success) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('notes-changed')
      }
    }

    // Get fresh context (note may have been updated)
    const context = buildNoteContext(noteId)
    const history = loadChatHistory(noteId)

    // Convert stored messages to agent format
    const agentHistory: ChatMessage[] = history.map((m) => ({
      role: m.role,
      content: m.content,
      toolCall: m.toolCall,
      toolResult: m.toolResult,
    }))

    // Continue the conversation with tool result
    const agent = getAgentService()
    const response = await agent.continueAfterTool(context, agentHistory, toolResult, (chunk: StreamChunk) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('chat-stream-chunk', chunk)
      }
    })

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('chat-stream-end')
    }

    return { toolResult, response }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('chat-stream-error', errorMessage)
    }
    throw error
  }
})

ipcMain.handle('chat-abort', async () => {
  if (agentService) {
    agentService.abort()
  }
})

// MCP IPC Handlers

// Get available MCP servers
ipcMain.handle('mcp-get-servers', async () => {
  const config = loadConfig()
  const servers = config.mcpServers || []

  // Ensure day.ai is in the list
  const dayAiServer = servers.find((s) => s.id === 'day-ai')
  if (!dayAiServer) {
    return [{ ...DAY_AI_CONFIG, connected: false }]
  }

  return servers
})

// Helper to create token refresh callback
function createTokenRefreshCallback(serverId: string) {
  return (tokens: OAuthService.OAuthTokens) => {
    console.log(`[MCP] Persisting refreshed tokens for ${serverId}`)
    const config = loadConfig()
    const servers = config.mcpServers || []
    const serverIndex = servers.findIndex((s) => s.id === serverId)
    if (serverIndex >= 0 && servers[serverIndex].oauth) {
      servers[serverIndex].oauth!.accessToken = tokens.accessToken
      if (tokens.refreshToken) {
        servers[serverIndex].oauth!.refreshToken = tokens.refreshToken
      }
      if (tokens.expiresIn) {
        servers[serverIndex].oauth!.expiresAt = Date.now() + tokens.expiresIn * 1000
      }
      saveConfig({ ...config, mcpServers: servers })
    }
  }
}

// Start MCP OAuth connection flow
ipcMain.handle('mcp-connect', async (_event, serverId: string) => {
  const config = loadConfig()
  const servers = config.mcpServers || []

  // Find or create server config
  let serverConfig = servers.find((s) => s.id === serverId)
  if (!serverConfig) {
    if (serverId === 'day-ai') {
      serverConfig = { ...DAY_AI_CONFIG, connected: false }
    } else {
      throw new Error(`Unknown MCP server: ${serverId}`)
    }
  }

  try {
    // Step 1: Dynamic Client Registration
    let clientId = serverConfig.oauth?.clientId
    if (!clientId) {
      console.log('[MCP] Registering OAuth client...')
      const registration = await OAuthService.registerClient(
        serverConfig.registrationEndpoint,
        OAUTH_REDIRECT_URI,
        'Day AI Demo'
      )
      clientId = registration.clientId
      console.log('[MCP] Registered client:', clientId)
    }

    // Step 2: Start OAuth flow
    console.log('[MCP] Starting OAuth flow...')
    const tokens = await OAuthService.startAuthFlow(
      {
        baseUrl: serverConfig.baseUrl,
        authEndpoint: serverConfig.authEndpoint,
        tokenEndpoint: serverConfig.tokenEndpoint,
        registrationEndpoint: serverConfig.registrationEndpoint,
        scopes: serverConfig.scopes,
      },
      clientId
    )

    // Step 3: Save tokens to config
    const calculatedExpiresAt = tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : undefined
    const updatedServer: MCPServerConfig = {
      ...serverConfig,
      connected: true,
      oauth: {
        clientId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: calculatedExpiresAt,
      },
    }

    // Update config
    const updatedServers = servers.filter((s) => s.id !== serverId)
    updatedServers.push(updatedServer)
    saveConfig({ ...config, mcpServers: updatedServers })

    // Step 4: Connect to MCP server
    console.log('[MCP] Connecting to MCP server...')
    const tools = await MCPClientService.connectToServer(
      serverId,
      serverConfig.mcpEndpoint,
      tokens.accessToken,
      {
        clientId,
        tokenEndpoint: serverConfig.tokenEndpoint,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : undefined,
      },
      createTokenRefreshCallback(serverId)
    )
    console.log('[MCP] Connected, available tools:', tools.length)

    return { success: true, tools }
  } catch (error) {
    console.error('[MCP] Connection error:', error)
    throw error
  }
})

// Disconnect from MCP server
ipcMain.handle('mcp-disconnect', async (_event, serverId: string) => {
  const config = loadConfig()
  const servers = config.mcpServers || []
  const serverConfig = servers.find((s) => s.id === serverId)

  if (serverConfig?.oauth) {
    try {
      await OAuthService.revokeToken(
        `${serverConfig.baseUrl}/api/oauth/revoke`,
        serverConfig.oauth.clientId,
        serverConfig.oauth.accessToken
      )
    } catch {
      // Ignore revocation errors
    }
  }

  // Disconnect MCP client
  await MCPClientService.disconnectServer(serverId)

  // Update config
  const updatedServer: MCPServerConfig = {
    ...(serverConfig || { ...DAY_AI_CONFIG }),
    connected: false,
    oauth: undefined,
  }
  const updatedServers = servers.filter((s) => s.id !== serverId)
  updatedServers.push(updatedServer)
  saveConfig({ ...config, mcpServers: updatedServers })

  return { success: true }
})

// Get all MCP tools
ipcMain.handle('mcp-list-tools', async () => {
  return MCPClientService.getAllMCPTools()
})

// Call an MCP tool
ipcMain.handle('mcp-call-tool', async (_event, serverId: string, toolName: string, args: Record<string, unknown>) => {
  return MCPClientService.callTool(serverId, toolName, args)
})

// Reconnect to saved MCP servers on startup
async function reconnectMCPServers() {
  const config = loadConfig()
  const servers = config.mcpServers || []

  for (const server of servers) {
    if (server.connected && server.oauth?.accessToken) {
      try {
        // Check if token is expired
        if (server.oauth.expiresAt && server.oauth.expiresAt < Date.now()) {
          if (server.oauth.refreshToken) {
            console.log(`[MCP] Refreshing token for ${server.id}...`)
            const tokens = await OAuthService.refreshAccessToken(
              server.tokenEndpoint,
              server.oauth.clientId,
              server.oauth.refreshToken
            )
            server.oauth.accessToken = tokens.accessToken
            server.oauth.refreshToken = tokens.refreshToken || server.oauth.refreshToken
            const newExpiresAt = tokens.expiresIn
              ? Date.now() + tokens.expiresIn * 1000
              : server.oauth.expiresAt
            server.oauth.expiresAt = newExpiresAt
            saveConfig({ ...config, mcpServers: servers })
          } else {
            console.log(`[MCP] Token expired for ${server.id}, marking as disconnected`)
            server.connected = false
            saveConfig({ ...config, mcpServers: servers })
            continue
          }
        }

        console.log(`[MCP] Reconnecting to ${server.id}...`)
        await MCPClientService.connectToServer(
          server.id,
          server.mcpEndpoint,
          server.oauth.accessToken,
          {
            clientId: server.oauth.clientId,
            tokenEndpoint: server.tokenEndpoint,
            refreshToken: server.oauth.refreshToken,
            expiresAt: server.oauth.expiresAt,
          },
          createTokenRefreshCallback(server.id)
        )
        console.log(`[MCP] Reconnected to ${server.id}`)
      } catch (error) {
        console.error(`[MCP] Failed to reconnect to ${server.id}:`, error)
        server.connected = false
        saveConfig({ ...config, mcpServers: servers })
      }
    }
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// App lifecycle
app.whenReady().then(async () => {
  createWindow()
  await reconnectMCPServers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Export for ToolExecutor
export { loadNotes, saveNotes }
