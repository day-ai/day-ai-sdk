import type Anthropic from '@anthropic-ai/sdk'

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'update_note',
    description:
      'Replace the entire content of the current note with new content. Use this when the user asks to edit, rewrite, or modify the note.',
    input_schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The new content for the note (plain text or simple HTML)',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'search_notes',
    description: 'Search through all notes by title or content. Returns matching notes with snippets.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to match against note titles and content',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_note',
    description: 'Create a new note with the specified title and content.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The title for the new note',
        },
        content: {
          type: 'string',
          description: 'The content for the new note (optional)',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'read_note',
    description:
      'Read the full content of another note by its ID or title. Use this when the user references another note.',
    input_schema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'The ID of the note to read (optional if title provided)',
        },
        title: {
          type: 'string',
          description: 'The title of the note to read (optional if noteId provided)',
        },
      },
    },
  },
]
