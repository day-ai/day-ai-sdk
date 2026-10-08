import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { executeToolCall } from './ToolExecutor'
import { AGENT_TOOLS } from './tools'

/**
 * Server name for the note tools. Claude sees them as
 * `mcp__notes__update_note`, `mcp__notes__search_notes`, and so on.
 */
export const NOTES_SERVER_NAME = 'notes'

export type NotesChange = { type: 'updated'; noteId: string } | { type: 'created' }

const describe = (name: string) => AGENT_TOOLS.find((t) => t.name === name)?.description ?? ''

/**
 * Expose the app's note tools to the Claude Agent SDK as an in-process MCP
 * server. Handlers reuse ToolExecutor, so the Agent SDK and the plain
 * Anthropic SDK example share one implementation.
 *
 * `noteId` is the note open in the editor; `update_note` edits that note.
 * `onNotesChanged` fires after a successful write so the UI can refresh.
 */
export function createNotesMcpServer(noteId: string, onNotesChanged?: (change: NotesChange) => void) {
  const run = async (name: string, parameters: Record<string, unknown>) => {
    const result = await executeToolCall({ id: `${name}-${Date.now()}`, name, parameters }, noteId)

    if (result.success && name === 'update_note') onNotesChanged?.({ type: 'updated', noteId })
    if (result.success && name === 'create_note') onNotesChanged?.({ type: 'created' })

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result.success ? result.result : { error: result.error }),
        },
      ],
      ...(result.success ? {} : { isError: true }),
    }
  }

  return createSdkMcpServer({
    name: NOTES_SERVER_NAME,
    version: '1.0.0',
    tools: [
      tool(
        'update_note',
        describe('update_note'),
        { content: z.string().describe('The new content for the note (plain text or simple HTML)') },
        (args) => run('update_note', args)
      ),
      tool(
        'search_notes',
        describe('search_notes'),
        { query: z.string().describe('The search query to match against note titles and content') },
        (args) => run('search_notes', args),
        { annotations: { readOnlyHint: true } }
      ),
      tool(
        'create_note',
        describe('create_note'),
        {
          title: z.string().describe('The title for the new note'),
          content: z.string().optional().describe('The content for the new note (optional)'),
        },
        (args) => run('create_note', args)
      ),
      tool(
        'read_note',
        describe('read_note'),
        {
          noteId: z.string().optional().describe('The ID of the note to read (optional if title provided)'),
          title: z.string().optional().describe('The title of the note to read (optional if noteId provided)'),
        },
        (args) => run('read_note', args),
        { annotations: { readOnlyHint: true } }
      ),
    ],
  })
}
