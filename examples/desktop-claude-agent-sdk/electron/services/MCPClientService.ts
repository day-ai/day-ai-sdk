import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { refreshAccessToken, OAuthTokens } from './OAuthService'

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

export interface MCPToolInfo {
  serverId: string
  name: string
  title?: string
  description: string
  inputSchema: Record<string, unknown>
  icons?: MCPToolIcon[]
}

export interface MCPOAuthConfig {
  clientId: string
  tokenEndpoint: string
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

export interface MCPServerConnection {
  serverId: string
  client: Client
  transport: StreamableHTTPClientTransport
  tools: MCPToolInfo[]
  mcpEndpoint: string
  oauth?: MCPOAuthConfig
  onTokenRefreshed?: (tokens: OAuthTokens) => void
}

// Store active MCP connections
const connections = new Map<string, MCPServerConnection>()

// Buffer time before expiry to proactively refresh (5 minutes)
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

/**
 * Connect to an MCP server with OAuth authentication
 */
export async function connectToServer(
  serverId: string,
  mcpEndpoint: string,
  accessToken: string,
  oauthConfig?: Omit<MCPOAuthConfig, 'accessToken'>,
  onTokenRefreshed?: (tokens: OAuthTokens) => void
): Promise<MCPToolInfo[]> {
  // Disconnect existing connection if any
  await disconnectServer(serverId)

  // Create transport with Bearer token authentication
  const transport = new StreamableHTTPClientTransport(new URL(mcpEndpoint), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })

  // Create client
  const client = new Client(
    {
      name: 'Day AI Demo',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // Connect
  await client.connect(transport)

  // List available tools
  const toolsResult = await client.listTools()
  const tools: MCPToolInfo[] = (toolsResult.tools || []).map((tool) => ({
    serverId,
    name: tool.name,
    title: (tool as Record<string, unknown>).title as string | undefined,
    description: tool.description || '',
    inputSchema: tool.inputSchema as Record<string, unknown>,
    icons: (tool as Record<string, unknown>).icons as MCPToolIcon[] | undefined,
  }))

  // Store connection with OAuth config for refresh capability
  connections.set(serverId, {
    serverId,
    client,
    transport,
    tools,
    mcpEndpoint,
    oauth: oauthConfig ? { ...oauthConfig, accessToken } : undefined,
    onTokenRefreshed,
  })

  return tools
}

/**
 * Disconnect from an MCP server
 */
export async function disconnectServer(serverId: string): Promise<void> {
  const connection = connections.get(serverId)
  if (connection) {
    try {
      await connection.client.close()
    } catch {
      // Ignore close errors
    }
    connections.delete(serverId)
  }
}

/**
 * Get all tools from all connected MCP servers
 */
export function getAllMCPTools(): MCPToolInfo[] {
  const allTools: MCPToolInfo[] = []
  for (const connection of connections.values()) {
    allTools.push(...connection.tools)
  }
  return allTools
}

/**
 * Get tools from a specific server
 */
export function getServerTools(serverId: string): MCPToolInfo[] {
  const connection = connections.get(serverId)
  return connection?.tools || []
}

/**
 * Check if token needs refresh
 */
function shouldRefreshToken(connection: MCPServerConnection): boolean {
  if (!connection.oauth?.expiresAt) {
    return false
  }
  return Date.now() + TOKEN_REFRESH_BUFFER_MS >= connection.oauth.expiresAt
}

/**
 * Refresh the OAuth token and reconnect to the MCP server
 */
async function refreshAndReconnect(connection: MCPServerConnection): Promise<void> {
  if (!connection.oauth?.refreshToken) {
    throw new Error('No refresh token available')
  }

  console.log(`[MCP] Refreshing token for ${connection.serverId}...`)

  const tokens = await refreshAccessToken(
    connection.oauth.tokenEndpoint,
    connection.oauth.clientId,
    connection.oauth.refreshToken
  )

  // Update the stored OAuth config
  connection.oauth.accessToken = tokens.accessToken
  if (tokens.refreshToken) {
    connection.oauth.refreshToken = tokens.refreshToken
  }
  if (tokens.expiresIn) {
    connection.oauth.expiresAt = Date.now() + tokens.expiresIn * 1000
  }

  // Notify about token refresh so main process can persist
  if (connection.onTokenRefreshed) {
    connection.onTokenRefreshed(tokens)
  }

  // Close existing connection
  try {
    await connection.client.close()
  } catch {
    // Ignore close errors
  }

  // Create new transport with fresh token
  const transport = new StreamableHTTPClientTransport(new URL(connection.mcpEndpoint), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    },
  })

  // Create new client
  const client = new Client(
    {
      name: 'Day AI Demo',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // Reconnect
  await client.connect(transport)

  // Update connection
  connection.client = client
  connection.transport = transport

  // Refresh tools list
  const toolsResult = await client.listTools()
  connection.tools = (toolsResult.tools || []).map((tool) => ({
    serverId: connection.serverId,
    name: tool.name,
    title: (tool as Record<string, unknown>).title as string | undefined,
    description: tool.description || '',
    inputSchema: tool.inputSchema as Record<string, unknown>,
    icons: (tool as Record<string, unknown>).icons as MCPToolIcon[] | undefined,
  }))

  console.log(`[MCP] Token refreshed and reconnected to ${connection.serverId}`)
}

/**
 * Check if an error indicates an authentication failure
 */
function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('401') ||
      message.includes('unauthorized') ||
      message.includes('invalid token') ||
      message.includes('token expired') ||
      message.includes('authentication')
    )
  }
  return false
}

/**
 * Call a tool on an MCP server with automatic token refresh
 */
export async function callTool(
  serverId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const connection = connections.get(serverId)
  if (!connection) {
    throw new Error(`MCP server ${serverId} is not connected`)
  }

  // Proactively refresh token if near expiry
  if (shouldRefreshToken(connection)) {
    try {
      await refreshAndReconnect(connection)
    } catch (refreshError) {
      console.error(`[MCP] Proactive token refresh failed:`, refreshError)
    }
  }

  // Try to call the tool
  try {
    return await executeToolCall(connection, toolName, args)
  } catch (error) {
    // If auth error and we have refresh capability, try to refresh and retry
    if (isAuthError(error) && connection.oauth?.refreshToken) {
      console.log(`[MCP] Auth error on tool call, attempting token refresh...`)
      try {
        await refreshAndReconnect(connection)
        return await executeToolCall(connection, toolName, args)
      } catch (refreshError) {
        console.error(`[MCP] Token refresh failed:`, refreshError)
        throw new Error(`Authentication failed and token refresh unsuccessful: ${refreshError}`)
      }
    }
    throw error
  }
}

/**
 * Execute a tool call on the MCP connection
 */
async function executeToolCall(
  connection: MCPServerConnection,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const result = await connection.client.callTool({
    name: toolName,
    arguments: args,
  })

  // Handle the result based on its type
  if (result.isError) {
    throw new Error(
      result.content
        .map((c) => (c.type === 'text' ? c.text : JSON.stringify(c)))
        .join('\n')
    )
  }

  // Extract the result content
  const content = result.content
  if (content.length === 1 && content[0].type === 'text') {
    try {
      return JSON.parse(content[0].text)
    } catch {
      return content[0].text
    }
  }

  return content
}

/**
 * Check if a server is connected
 */
export function isServerConnected(serverId: string): boolean {
  return connections.has(serverId)
}

/**
 * Get list of connected server IDs
 */
export function getConnectedServerIds(): string[] {
  return Array.from(connections.keys())
}

/**
 * Disconnect all servers
 */
export async function disconnectAll(): Promise<void> {
  const serverIds = Array.from(connections.keys())
  for (const serverId of serverIds) {
    await disconnectServer(serverId)
  }
}

/**
 * Convert MCP tools to Claude tool format
 */
export function mcpToolsToClaudeFormat(tools: MCPToolInfo[]): Array<{
  name: string
  description: string
  input_schema: Record<string, unknown>
}> {
  return tools.map((tool) => ({
    name: `mcp__${tool.serverId}__${tool.name}`,
    description: `[${tool.serverId}] ${tool.description}`,
    input_schema: tool.inputSchema,
  }))
}

/**
 * Parse a prefixed MCP tool name into server ID and tool name
 */
export function parseMCPToolName(prefixedName: string): { serverId: string; toolName: string } | null {
  if (!prefixedName.startsWith('mcp__')) {
    return null
  }

  const parts = prefixedName.slice(5).split('__')
  if (parts.length < 2) {
    return null
  }

  return {
    serverId: parts[0],
    toolName: parts.slice(1).join('__'),
  }
}

/**
 * Get connected MCP server configurations for the Claude Agent SDK
 * Returns server URLs with their OAuth access tokens for authenticated access
 */
export function getConnectedServersForSDK(): Array<{
  type: 'http'
  url: string
  name: string
  headers?: Record<string, string>
}> {
  const servers: Array<{
    type: 'http'
    url: string
    name: string
    headers?: Record<string, string>
  }> = []

  for (const connection of connections.values()) {
    const serverConfig: {
      type: 'http'
      url: string
      name: string
      headers?: Record<string, string>
    } = {
      type: 'http',
      url: connection.mcpEndpoint,
      name: connection.serverId,
    }

    // Add OAuth bearer token if available
    if (connection.oauth?.accessToken) {
      serverConfig.headers = {
        Authorization: `Bearer ${connection.oauth.accessToken}`,
      }
    }

    servers.push(serverConfig)
  }

  return servers
}
