import { v4 as uuidv4 } from 'uuid'
import { loadNotes, saveNotes } from '../main'
import { parseMCPToolName, callTool as mcpCallTool } from './MCPClientService'

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

/**
 * Execute a tool call and return the result
 */
export async function executeToolCall(toolCall: ToolCall, noteId: string): Promise<ToolResult> {
  // Check if this is an MCP tool
  const mcpToolInfo = parseMCPToolName(toolCall.name)
  if (mcpToolInfo) {
    return executeMCPTool(toolCall, mcpToolInfo)
  }

  // Handle native tools
  switch (toolCall.name) {
    case 'update_note':
      return executeUpdateNote(toolCall, noteId)
    case 'search_notes':
      return executeSearchNotes(toolCall)
    case 'create_note':
      return executeCreateNote(toolCall)
    case 'read_note':
      return executeReadNote(toolCall)
    default:
      return {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        success: false,
        error: `Unknown tool: ${toolCall.name}`,
      }
  }
}

/**
 * Execute an MCP tool call
 */
async function executeMCPTool(
  toolCall: ToolCall,
  mcpToolInfo: { serverId: string; toolName: string }
): Promise<ToolResult> {
  try {
    const result = await mcpCallTool(mcpToolInfo.serverId, mcpToolInfo.toolName, toolCall.parameters)
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      success: true,
      result,
    }
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update the current note's content
 */
function executeUpdateNote(toolCall: ToolCall, noteId: string): ToolResult {
  const { content } = toolCall.parameters as { content: string }
  const data = loadNotes()
  const noteIndex = data.notes.findIndex((n) => n.id === noteId)

  if (noteIndex === -1) {
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      success: false,
      error: 'Note not found',
    }
  }

  data.notes[noteIndex].content = content
  data.notes[noteIndex].updatedAt = new Date().toISOString()
  saveNotes(data)

  return {
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    success: true,
    result: { message: 'Note updated successfully' },
  }
}

/**
 * Search through all notes
 */
function executeSearchNotes(toolCall: ToolCall): ToolResult {
  const { query } = toolCall.parameters as { query: string }
  const data = loadNotes()
  const queryLower = query.toLowerCase()

  const matches = data.notes
    .filter((note) => {
      const titleMatch = note.title.toLowerCase().includes(queryLower)
      const contentMatch = note.content.toLowerCase().includes(queryLower)
      return titleMatch || contentMatch
    })
    .map((note) => {
      // Get a snippet around the match
      const contentLower = note.content.toLowerCase()
      const matchIndex = contentLower.indexOf(queryLower)
      let snippet = ''
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 50)
        const end = Math.min(note.content.length, matchIndex + query.length + 50)
        snippet = (start > 0 ? '...' : '') + note.content.slice(start, end) + (end < note.content.length ? '...' : '')
      }
      return {
        id: note.id,
        title: note.title,
        snippet: snippet || note.content.slice(0, 100) + '...',
        updatedAt: note.updatedAt,
      }
    })

  return {
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    success: true,
    result: {
      matches,
      count: matches.length,
    },
  }
}

/**
 * Create a new note
 */
function executeCreateNote(toolCall: ToolCall): ToolResult {
  const { title, content } = toolCall.parameters as { title: string; content?: string }
  const data = loadNotes()
  const now = new Date().toISOString()

  const newNote = {
    id: uuidv4(),
    title,
    content: content || '',
    createdAt: now,
    updatedAt: now,
  }

  data.notes.unshift(newNote)
  saveNotes(data)

  return {
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    success: true,
    result: {
      message: 'Note created successfully',
      noteId: newNote.id,
      title: newNote.title,
    },
  }
}

/**
 * Read another note by ID or title
 */
function executeReadNote(toolCall: ToolCall): ToolResult {
  const { noteId, title } = toolCall.parameters as { noteId?: string; title?: string }
  const data = loadNotes()

  let note = null
  if (noteId) {
    note = data.notes.find((n) => n.id === noteId)
  } else if (title) {
    note = data.notes.find((n) => n.title.toLowerCase() === title.toLowerCase())
  }

  if (!note) {
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      success: false,
      error: 'Note not found',
    }
  }

  return {
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    success: true,
    result: {
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    },
  }
}
