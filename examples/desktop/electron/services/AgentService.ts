import Anthropic from '@anthropic-ai/sdk'
import { AGENT_TOOLS } from './tools'
import { getAllMCPTools, mcpToolsToClaudeFormat, MCPToolInfo } from './MCPClientService'

export interface NoteContext {
  noteId: string
  noteTitle: string
  noteContent: string
  noteContentPlainText: string
}

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
  role: 'user' | 'assistant'
  content: string
  toolCall?: ToolCall
  toolResult?: ToolResult
}

export interface AgentResponse {
  thinking?: string
  content: string
  toolCall?: ToolCall
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens'
}

export type StreamChunk = { type: 'text'; content: string } | { type: 'thinking'; content: string }

export class AgentService {
  private client: Anthropic
  private abortController: AbortController | null = null

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async chat(
    message: string,
    context: NoteContext,
    history: ChatMessage[],
    onStreamChunk?: (chunk: StreamChunk) => void
  ): Promise<AgentResponse> {
    this.abortController = new AbortController()

    // Merge native tools with MCP tools
    const mcpTools = getAllMCPTools()
    const allTools = this.mergeTools(mcpTools)

    const systemPrompt = this.buildSystemPrompt(context, mcpTools)
    const messages = this.buildMessages(history, message)

    const stream = await this.client.messages.stream(
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: allTools,
      },
      {
        signal: this.abortController.signal,
      }
    )

    let content = ''
    let thinking = ''
    let toolCall: ToolCall | undefined

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          content += event.delta.text
          onStreamChunk?.({ type: 'text', content: event.delta.text })
        } else if (event.delta.type === 'thinking_delta') {
          thinking += event.delta.thinking
          onStreamChunk?.({ type: 'thinking', content: event.delta.thinking })
        }
      }
    }

    const finalMessage = await stream.finalMessage()

    // Extract tool call if present
    for (const block of finalMessage.content) {
      if (block.type === 'tool_use') {
        toolCall = {
          id: block.id,
          name: block.name,
          parameters: block.input as Record<string, unknown>,
        }
        break
      }
    }

    return {
      thinking: thinking || undefined,
      content,
      toolCall,
      stopReason: finalMessage.stop_reason as 'end_turn' | 'tool_use' | 'max_tokens',
    }
  }

  async continueAfterTool(
    context: NoteContext,
    history: ChatMessage[],
    toolResult: ToolResult,
    onStreamChunk?: (chunk: StreamChunk) => void
  ): Promise<AgentResponse> {
    this.abortController = new AbortController()

    // Merge native tools with MCP tools
    const mcpTools = getAllMCPTools()
    const allTools = this.mergeTools(mcpTools)

    const systemPrompt = this.buildSystemPrompt(context, mcpTools)
    const messages = this.buildMessagesWithToolResult(history, toolResult)

    const stream = await this.client.messages.stream(
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: allTools,
      },
      {
        signal: this.abortController.signal,
      }
    )

    let content = ''
    let thinking = ''
    let toolCall: ToolCall | undefined

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          content += event.delta.text
          onStreamChunk?.({ type: 'text', content: event.delta.text })
        } else if (event.delta.type === 'thinking_delta') {
          thinking += event.delta.thinking
          onStreamChunk?.({ type: 'thinking', content: event.delta.thinking })
        }
      }
    }

    const finalMessage = await stream.finalMessage()

    // Extract tool call if present
    for (const block of finalMessage.content) {
      if (block.type === 'tool_use') {
        toolCall = {
          id: block.id,
          name: block.name,
          parameters: block.input as Record<string, unknown>,
        }
        break
      }
    }

    return {
      thinking: thinking || undefined,
      content,
      toolCall,
      stopReason: finalMessage.stop_reason as 'end_turn' | 'tool_use' | 'max_tokens',
    }
  }

  abort(): void {
    this.abortController?.abort()
  }

  private mergeTools(mcpTools: MCPToolInfo[]): Anthropic.Tool[] {
    const nativeTools = AGENT_TOOLS as Anthropic.Tool[]
    const convertedMcpTools = mcpToolsToClaudeFormat(mcpTools) as Anthropic.Tool[]
    return [...nativeTools, ...convertedMcpTools]
  }

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

  private buildMessages(history: ChatMessage[], newMessage: string): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = []

    for (const msg of history) {
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: msg.content })
      } else {
        // Build assistant message with potential tool use
        const content: Anthropic.ContentBlockParam[] = []
        if (msg.content) {
          content.push({ type: 'text', text: msg.content })
        }
        if (msg.toolCall) {
          content.push({
            type: 'tool_use',
            id: msg.toolCall.id,
            name: msg.toolCall.name,
            input: msg.toolCall.parameters,
          })
        }
        if (content.length > 0) {
          messages.push({ role: 'assistant', content })
        }

        // If there's a tool result, add it
        if (msg.toolResult) {
          messages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: msg.toolResult.toolCallId,
                content: JSON.stringify(msg.toolResult.result || { error: msg.toolResult.error }),
              },
            ],
          })
        }
      }
    }

    // Add the new user message
    messages.push({ role: 'user', content: newMessage })

    return messages
  }

  private buildMessagesWithToolResult(
    history: ChatMessage[],
    toolResult: ToolResult
  ): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = []

    for (const msg of history) {
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: msg.content })
      } else {
        // Build assistant message with potential tool use
        const content: Anthropic.ContentBlockParam[] = []
        if (msg.content) {
          content.push({ type: 'text', text: msg.content })
        }
        if (msg.toolCall) {
          content.push({
            type: 'tool_use',
            id: msg.toolCall.id,
            name: msg.toolCall.name,
            input: msg.toolCall.parameters,
          })
        }
        if (content.length > 0) {
          messages.push({ role: 'assistant', content })
        }

        // If there's a tool result already, add it
        if (msg.toolResult) {
          messages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: msg.toolResult.toolCallId,
                content: JSON.stringify(msg.toolResult.result || { error: msg.toolResult.error }),
              },
            ],
          })
        }
      }
    }

    // Add the new tool result
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolResult.toolCallId,
          content: JSON.stringify(toolResult.result || { error: toolResult.error }),
        },
      ],
    })

    return messages
  }
}
