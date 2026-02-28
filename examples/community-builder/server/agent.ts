import Anthropic from '@anthropic-ai/sdk'
import { DayAIClient, type McpTool } from '../../../src/client'

let dayai: DayAIClient | null = null

function getDayAI(): DayAIClient {
  if (!dayai) {
    const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, DAY_AI_BASE_URL } = process.env
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      throw new Error(
        'Missing Day AI credentials. Set CLIENT_ID, CLIENT_SECRET, and REFRESH_TOKEN in .env',
      )
    }
    dayai = new DayAIClient({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      refreshToken: REFRESH_TOKEN,
      baseUrl: DAY_AI_BASE_URL || 'https://day.ai',
    })
  }
  return dayai
}

function mcpToolToAnthropicTool(tool: McpTool): Anthropic.Tool {
  return {
    name: tool.name,
    description: tool.description || '',
    input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
  }
}

export interface CommunityMember {
  email: string
  linkedInUrl: string
  firstName: string
  lastName: string
  howICanHelp: string
  whereINeedHelp: string
}

type SendEvent = (event: Record<string, unknown>) => void

const SYSTEM_PROMPT = `You are a community onboarding agent. A new member is joining the community and has shared their information. Your job is to add or update them in the Day AI CRM.

Follow these steps:
1. Read the CRM schema for native_contact (and native_organization) so you know every available field.
2. Search for an existing contact by email using search_objects.
3. Create or update the contact with the information provided using create_or_update_person_organization. Store "How I can help" and "Where I could use help" as notes on the contact.
4. If they provided a company (from their email domain or LinkedIn), search for and link the organization too.

After completing the sync, provide a brief welcome summary: confirm what was saved, and highlight any connections or matches you noticed in the CRM (e.g. other community members at the same company, or people who could help with what they need).`

export async function runAgentLoop(member: CommunityMember, send: SendEvent): Promise<void> {
  const anthropic = new Anthropic()
  const client = getDayAI()

  send({ type: 'status', message: 'Connecting to Day AI...' })

  // List and convert MCP tools
  const toolsResult = await client.mcpListTools()
  if (!toolsResult.success || !toolsResult.data) {
    send({ type: 'error', message: `Failed to list MCP tools: ${toolsResult.error}` })
    return
  }

  const tools = toolsResult.data.tools.map(mcpToolToAnthropicTool)
  send({ type: 'status', message: `Loaded ${tools.length} MCP tools` })

  // Build the user message from member data
  const fields = [
    `Email: ${member.email}`,
    member.firstName && `First Name: ${member.firstName}`,
    member.lastName && `Last Name: ${member.lastName}`,
    member.linkedInUrl && `LinkedIn: ${member.linkedInUrl}`,
    member.howICanHelp && `How I can help: ${member.howICanHelp}`,
    member.whereINeedHelp && `Where I could use help: ${member.whereINeedHelp}`,
  ].filter(Boolean)

  const userMessage = `A new community member just signed up. Please add them to the CRM.\n\n${fields.join('\n')}`

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }]

  const MAX_ITERATIONS = 10

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    send({ type: 'status', message: i === 0 ? 'Thinking...' : 'Continuing...' })

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages,
      tools,
    })

    // Accumulate the streamed text for the final answer
    let streamedText = ''

    stream.on('text', (text) => {
      streamedText += text
      send({ type: 'text_delta', content: text })
    })

    const finalMessage = await stream.finalMessage()

    // Build the assistant content blocks for message history
    messages.push({ role: 'assistant', content: finalMessage.content })

    if (finalMessage.stop_reason === 'end_turn') {
      if (streamedText) {
        send({ type: 'answer', content: streamedText })
      }
      break
    }

    if (finalMessage.stop_reason === 'tool_use') {
      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = []

      for (const block of finalMessage.content) {
        if (block.type !== 'tool_use') continue

        const toolName = block.name
        const toolArgs = block.input as Record<string, unknown>

        send({ type: 'tool_call', name: toolName, args: toolArgs })

        try {
          const result = await client.mcpCallTool(toolName, toolArgs)

          if (result.success) {
            send({ type: 'tool_result', name: toolName, success: true })
            toolResultBlocks.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result.data),
            })
          } else {
            send({ type: 'tool_result', name: toolName, success: false })
            toolResultBlocks.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ error: result.error }),
              is_error: true,
            })
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error'
          send({ type: 'tool_result', name: toolName, success: false })
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ error: errMsg }),
            is_error: true,
          })
        }
      }

      messages.push({ role: 'user', content: toolResultBlocks })
    }
  }

  send({ type: 'complete', message: 'Welcome to the community!' })
}
