import { query } from '@anthropic-ai/claude-agent-sdk'
import { AGENT_TOOLS } from './tools'
import { getConnectedServersForSDK, getAllMCPTools, MCPToolInfo } from './MCPClientService'

// Re-export legacy types for backward compatibility
export interface NoteContext {
  noteId: string
  noteTitle: string
  noteContent: string
  noteContentPlainText: string
}

export interface ToolCall {
  id: string
  name: string
  title?: string
  input: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  toolName: string
  success: boolean
  result?: unknown
  error?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolCall?: ToolCall
  toolResult?: ToolResult
}

// SDK message types
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

export type SDKMessageType = 'system' | 'assistant' | 'user' | 'result'

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

// IPC message types for renderer communication
export interface AgentIPCMessage {
  type: 'session-created' | 'agent-message' | 'agent-complete' | 'agent-error' | 'token-budget'
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

// Legacy types for backward compatibility
export interface AgentResponse {
  thinking?: string
  content: string
  toolCall?: ToolCall
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens'
}

export type StreamChunk =
  | { type: 'text'; content: string }
  | { type: 'thinking'; content: string }
  | { type: 'sdk_message'; data: SDKMessage }

export interface AgentOptions {
  model?: string
  resume?: string // Session ID to resume
  claudeCodePath?: string // Path to Claude Code CLI
}

const DEFAULT_MODEL = 'sonnet'

export class AgentService {
  private activeQuery: ReturnType<typeof query> | null = null
  private apiKey: string
  private claudeCodePath: string
  private aborted = false
  private currentSessionId: string | undefined

  constructor(apiKey: string, claudeCodePath?: string) {
    this.apiKey = apiKey
    this.claudeCodePath = claudeCodePath || 'claude'
  }

  /**
   * Set the Claude Code CLI path
   */
  setClaudeCodePath(path: string): void {
    this.claudeCodePath = path
  }

  /**
   * Build the system prompt with note context and MCP tool info
   */
  private buildSystemPrompt(context: NoteContext, mcpTools: MCPToolInfo[] = []): string {
    const contentPreview =
      context.noteContentPlainText.length > 2000
        ? context.noteContentPlainText.substring(0, 2000) + '...'
        : context.noteContentPlainText

    let mcpSection = ''
    if (mcpTools.length > 0) {
      const toolsByServer = new Map<string, MCPToolInfo[]>()
      for (const tool of mcpTools) {
        const existing = toolsByServer.get(tool.serverId) || []
        existing.push(tool)
        toolsByServer.set(tool.serverId, existing)
      }

      mcpSection = '\n\nCONNECTED INTEGRATIONS:\n'
      for (const [serverId, tools] of toolsByServer) {
        mcpSection += `- ${serverId}: ${tools.map((t) => t.name).join(', ')}\n`
      }
      mcpSection += '\nYou can use these integration tools to access external services on behalf of the user.'
    }

    return `You are a helpful AI assistant integrated into a note-taking application that connects to Day AI.

CURRENT NOTE CONTEXT:
- Note ID: ${context.noteId}
- Title: ${context.noteTitle}
- Content Preview (plain text): ${contentPreview}

You can help the user by:
1. Answering questions about their current note
2. Editing or rewriting the current note using the update_note tool
3. Searching through all their notes using the search_notes tool
4. Creating new notes using the create_note tool
5. Reading other notes for reference using the read_note tool

When connected to Day AI, you can also:
- Search for people, organizations, and opportunities
- Get rich context about contacts and companies
- Access meeting recordings and transcripts
- Create and update CRM records

When editing notes, produce clean content. Use simple text or basic HTML if needed.

Be concise and helpful. If you need to edit a note, always use the update_note tool rather than just describing changes.${mcpSection}`
  }

  /**
   * Build native tools into SDK format
   */
  private buildNativeTools(): Array<{
    name: string
    description: string
    inputSchema: Record<string, unknown>
    execute: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>
  }> {
    // Note: The SDK handles tool execution through MCP servers
    // Native tools need to be exposed via a local MCP server or handled differently
    // For now, we'll include them in the system prompt but the actual execution
    // will need to be handled by the caller via the onMessage callback
    return AGENT_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.input_schema as Record<string, unknown>,
      execute: async () => {
        // This won't be called directly - tool execution is handled externally
        return { content: [{ type: 'text', text: 'Tool execution handled externally' }] }
      },
    }))
  }

  /**
   * Run an agent query using the Claude Agent SDK
   * This is the new primary interface that uses the SDK's async iterator
   */
  async chat(
    message: string,
    context: NoteContext,
    _history: ChatMessage[], // History is now managed by the SDK via session resumption
    onStreamChunk?: (chunk: StreamChunk) => void,
    options?: AgentOptions
  ): Promise<AgentResponse> {
    this.aborted = false

    // Get MCP tools for context in system prompt
    const mcpTools = getAllMCPTools()

    // Build system prompt with note context
    const systemPromptAppend = this.buildSystemPrompt(context, mcpTools)

    // Build SDK options
    const sdkOptions: Parameters<typeof query>[0]['options'] = {
      model: options?.model || DEFAULT_MODEL,
      systemPrompt: {
        type: 'preset',
        preset: 'default',
        append: systemPromptAppend,
      },
      maxThinkingTokens: 10000,
      permissionMode: 'bypassPermissions', // Trust the tools for this app
      pathToClaudeCodeExecutable: options?.claudeCodePath || this.claudeCodePath,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: this.apiKey,
      },
      // Pass connected MCP servers (Day AI, etc.) with their OAuth tokens
      mcpServers: getConnectedServersForSDK(),
    }

    // Resume session if provided
    if (options?.resume) {
      sdkOptions.resume = options.resume
    }

    let capturedSessionId: string | undefined
    let textContent = ''
    let thinkingContent = ''
    let lastToolCall: ToolCall | undefined
    let stopReason: 'end_turn' | 'tool_use' | 'max_tokens' = 'end_turn'

    try {
      // Create the query
      this.activeQuery = query({
        prompt: message,
        options: sdkOptions,
      })

      // Iterate over SDK messages
      for await (const sdkMessage of this.activeQuery) {
        if (this.aborted) {
          break
        }

        const msg = sdkMessage as SDKMessage

        // Capture session ID from first message
        if (msg.session_id && !capturedSessionId) {
          capturedSessionId = msg.session_id
          this.currentSessionId = capturedSessionId
        }

        // Forward the raw SDK message
        onStreamChunk?.({ type: 'sdk_message', data: msg })

        // Process message content for legacy response format
        if (msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === 'text' && block.text) {
              const delta = block.text
              textContent = delta // SDK sends full text, not deltas
              onStreamChunk?.({ type: 'text', content: delta })
            } else if (block.type === 'thinking' && block.thinking) {
              thinkingContent = block.thinking
              onStreamChunk?.({ type: 'thinking', content: block.thinking })
            } else if (block.type === 'tool_use' && block.name && block.id) {
              lastToolCall = {
                id: block.id,
                name: block.name,
                input: block.input || {},
              }
              stopReason = 'tool_use'
            }
          }
        }

        // Check for result message to determine stop reason
        if (msg.type === 'result') {
          if (msg.result === 'max_tokens') {
            stopReason = 'max_tokens'
          } else if (!lastToolCall) {
            stopReason = 'end_turn'
          }
        }
      }

      return {
        thinking: thinkingContent || undefined,
        content: textContent,
        toolCall: lastToolCall,
        stopReason,
      }
    } catch (error) {
      console.error('[AgentService] Query error:', error)
      throw error
    } finally {
      this.activeQuery = null
    }
  }

  /**
   * Run an agent query with full IPC message streaming
   * This is the newer interface that provides more detailed message streaming
   */
  async chatWithIPC(
    message: string,
    context: NoteContext,
    onMessage: (msg: AgentIPCMessage) => void,
    options?: AgentOptions
  ): Promise<void> {
    this.aborted = false

    // Get MCP tools for context in system prompt
    const mcpTools = getAllMCPTools()

    // Build system prompt with note context
    const systemPromptAppend = this.buildSystemPrompt(context, mcpTools)

    // Build SDK options
    const sdkOptions: Parameters<typeof query>[0]['options'] = {
      model: options?.model || DEFAULT_MODEL,
      systemPrompt: {
        type: 'preset',
        preset: 'default',
        append: systemPromptAppend,
      },
      maxThinkingTokens: 10000,
      permissionMode: 'bypassPermissions',
      pathToClaudeCodeExecutable: options?.claudeCodePath || this.claudeCodePath,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: this.apiKey,
      },
      mcpServers: getConnectedServersForSDK(),
    }

    // Resume session if provided
    if (options?.resume) {
      sdkOptions.resume = options.resume
    }

    let capturedSessionId: string | undefined

    try {
      this.activeQuery = query({
        prompt: message,
        options: sdkOptions,
      })

      for await (const sdkMessage of this.activeQuery) {
        if (this.aborted) {
          break
        }

        const msg = sdkMessage as SDKMessage

        // Capture session ID
        if (msg.session_id && !capturedSessionId) {
          capturedSessionId = msg.session_id
          this.currentSessionId = capturedSessionId
          onMessage({
            type: 'session-created',
            sessionId: capturedSessionId,
          })
        }

        // Forward SDK message to renderer
        onMessage({
          type: 'agent-message',
          sessionId: capturedSessionId,
          data: msg,
        })

        // Extract token usage from result messages
        if (msg.type === 'result') {
          const usage = msg.message?.usage
          if (usage) {
            onMessage({
              type: 'token-budget',
              sessionId: capturedSessionId,
              tokenBudget: {
                inputTokens: usage.input_tokens || 0,
                outputTokens: usage.output_tokens || 0,
                cacheReadTokens: usage.cache_read_input_tokens || 0,
                cacheCreationTokens: usage.cache_creation_input_tokens || 0,
                totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
              },
            })
          }
        }
      }

      // Signal completion
      onMessage({
        type: 'agent-complete',
        sessionId: capturedSessionId,
      })
    } catch (error) {
      onMessage({
        type: 'agent-error',
        sessionId: capturedSessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    } finally {
      this.activeQuery = null
    }
  }

  /**
   * Continue conversation after tool execution (legacy method)
   * With the SDK, this is handled automatically via session resumption
   */
  async continueAfterTool(
    context: NoteContext,
    _history: ChatMessage[],
    toolResult: ToolResult,
    onStreamChunk?: (chunk: StreamChunk) => void
  ): Promise<AgentResponse> {
    // With the Claude Agent SDK, tool results are passed back via the MCP server
    // The SDK handles the tool execution loop automatically
    // This method is kept for backward compatibility but may need adjustment
    // depending on how native tools are exposed

    // For now, send a message indicating the tool result
    const message = `Tool "${toolResult.toolName}" completed with result: ${JSON.stringify(toolResult.result || { error: toolResult.error })}`

    return this.chat(message, context, [], onStreamChunk, {
      resume: this.currentSessionId,
    })
  }

  /**
   * Get the current session ID for resumption
   */
  getSessionId(): string | undefined {
    return this.currentSessionId
  }

  /**
   * Abort the current query
   */
  async abort(): Promise<void> {
    this.aborted = true
    if (this.activeQuery) {
      try {
        await this.activeQuery.abort()
      } catch {
        // Ignore abort errors
      }
      this.activeQuery = null
    }
  }
}
