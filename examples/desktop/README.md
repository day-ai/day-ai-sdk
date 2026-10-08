# Day AI Desktop Demo

> **Best Way to Get Support**: Run `claude` from the root of this repo to ask questions and get help customizing this app.

An Electron notes app with a Claude chat panel that can read and edit your notes *and* search your Day AI CRM through MCP (Model Context Protocol).

It's a starting template: clone it, swap "notes" for your own kind of object, and you have an AI tool wired into Day AI. Expect to add your own error handling and packaging before you ship it.

## The "Object-of-Work" Pattern

This demo illustrates a powerful pattern for AI-powered applications:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Application                         │
│                                                                 │
│   ┌─────────────┐                      ┌─────────────────────┐  │
│   │   Object    │◄────── AI Agent ────►│     Day AI          │  │
│   │  of Work    │        (Claude)      │   (via MCP)         │  │
│   │             │                      │                     │  │
│   │  - Read     │   Can read/write     │  - Search contacts  │  │
│   │  - Write    │   both sides         │  - Get context      │  │
│   │  - Focus    │                      │  - Create records   │  │
│   └─────────────┘                      └─────────────────────┘  │
│         ▲                                                       │
│         │                                                       │
│     User works                                                  │
│     on this                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### What is an "Object of Work"?

An **object of work** is the primary data entity that a user focuses on within your application. In this demo, it's a **Note** - but it could be anything:

- A document or report
- A customer record
- A project or task
- An email draft
- A design file

The pattern works like this:

1. **User focuses** on an object (e.g., opens a note)
2. **AI agent** has tools to read and modify that object
3. **Day AI integration** provides additional context (contacts, organizations, meetings) and actions (create records, send emails)
4. **The AI bridges both worlds** - understanding your local data AND Day AI's CRM data

### Example Interaction

```
User: "Update this note with context about John Smith from my last meeting"

AI Agent:
1. Uses Day AI's `search_objects` to find the contact (firstName/lastName contains "John" / "Smith")
2. Searches meetings with that contact's objectId, then reads the latest with `get_meeting_recording_context`
3. Uses the local `update_note` tool to write the summary into the note
```

## Quick Start

### Prerequisites

- Node.js 20+
- An Anthropic API key ([get one here](https://console.anthropic.com))
- A Day AI account (optional, for MCP integration)

### Installation

```bash
# Navigate to the demo directory
cd examples/desktop

# Install dependencies
yarn install

# Copy environment template
cp .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=sk-ant-...

# Start the app
yarn dev
```

### Connecting to Day AI

1. Click the **Settings** icon (gear) in the top bar
2. Find "Day.ai" under Integrations
3. Click **Connect**
4. Complete the OAuth flow in your browser
5. Return to the app - Day AI tools are now available

Once connected, the AI agent can:
- Search for people, organizations, and opportunities in Day AI
- Get rich context about contacts (job history, company info, recent interactions)
- Access meeting recordings and transcripts
- Create and update CRM records
- Draft emails

Which Day AI tools appear depends on the plan of the Day AI assistant you pick when connecting.

## Architecture

```
examples/desktop/
├── electron/
│   ├── main.ts              # Electron main process + IPC handlers
│   ├── preload.ts           # Secure IPC bridge
│   └── services/
│       ├── AgentService.ts      # Claude chat with streaming + tools
│       ├── OAuthService.ts      # Day AI OAuth (dynamic registration + refresh)
│       ├── MCPClientService.ts  # MCP client with token refresh
│       ├── ToolExecutor.ts      # Executes native + MCP tools
│       └── tools.ts             # Native tool definitions
├── src/
│   ├── App.tsx              # Main React component
│   ├── components/
│   │   ├── TopBar.tsx       # Header with controls
│   │   ├── Sidebar.tsx      # Notes list
│   │   ├── ChatPane.tsx     # AI chat interface
│   │   ├── SettingsModal.tsx    # API key + integrations
│   │   └── NoteEditor.tsx   # Note editing area
│   └── types/
│       └── index.ts         # TypeScript definitions
└── README.md                # This file
```

### Key Services

| Service | Purpose |
|---------|---------|
| `AgentService` | Orchestrates Claude conversations, merges native + MCP tools |
| `OAuthService` | Handles the Day AI OAuth flow and token refresh |
| `MCPClientService` | Maintains MCP connection, handles token refresh |
| `ToolExecutor` | Routes tool calls to native handlers or MCP |

## Native Tools

The AI agent has these built-in tools for working with notes:

| Tool | Description |
|------|-------------|
| `update_note` | Replace the content of the current note |
| `search_notes` | Search all notes by title/content |
| `create_note` | Create a new note |
| `read_note` | Read another note by ID or title |

## Day AI MCP Tools

When connected to Day AI, additional tools become available:

| Tool | Description |
|------|-------------|
| `search_objects` | Search contacts, companies, opportunities, meetings, emails and more |
| `read_crm_schema` | See the properties and relationships available in your workspace |
| `get_meeting_recording_context` | Get transcripts and summaries from meetings |
| `create_or_update_person_organization` | Create or update contacts and companies |
| `create_email_draft` | Draft an email |

See [TOOLS.md](../../TOOLS.md) for the full list and [SCHEMA.md](../../SCHEMA.md) for how searches work. One rule worth knowing: contacts and companies are found by their `email` / `domain` property first, and relationship searches then use the returned objectId.

## Customizing for Your Use Case

### Replacing the "Note" with Your Object

1. **Define your type** in `src/types/index.ts`:
   ```typescript
   interface MyObject {
     id: string
     // ... your fields
   }
   ```

2. **Update native tools** in `electron/services/tools.ts`:
   ```typescript
   export const AGENT_TOOLS = [
     {
       name: 'update_my_object',
       description: 'Update the current object...',
       input_schema: { /* ... */ }
     }
   ]
   ```

3. **Implement tool handlers** in `electron/services/ToolExecutor.ts`

4. **Update UI components** to display your object type

### Adding New Native Tools

1. Add tool definition to `tools.ts`
2. Add handler to `ToolExecutor.ts`
3. The agent automatically gets access to the new tool

### Changing the Model

The app uses `claude-sonnet-5-5`. Change `MODEL` at the top of `electron/services/AgentService.ts` — for example to `claude-opus-5-5` for heavier research tasks.

### Changing the System Prompt

Edit `AgentService.ts` to customize how the AI understands your application:

```typescript
private buildSystemPrompt(context: NoteContext): string {
  return `You are an AI assistant for [Your App Name]...`
}
```

## Development

```bash
# Start development server
yarn dev

# Type-check and build
yarn build

# Package for distribution (config is in package.json)
npx electron-builder
```

## How It Works

### OAuth 2.0 Flow

1. App registers itself with Day AI (dynamic client registration)
2. You sign in to Day AI in your browser and pick a workspace and assistant
3. Day AI redirects to a local callback server
4. App exchanges the authorization code for tokens
5. Tokens are stored locally and refreshed automatically

Disconnecting forgets the tokens on this machine. To remove the app's access entirely, remove the integration in Day AI's settings.

### MCP Connection

1. After OAuth, app connects to Day AI's MCP endpoint
2. MCP client lists available tools
3. Tools are merged with native tools and provided to Claude
4. When Claude calls an MCP tool, the call is routed through the MCP client
5. Token refresh happens automatically if needed

### Chat Flow

1. User sends message
2. Message + note context + chat history sent to Claude
3. Claude streams response (shown in real-time)
4. If Claude calls a tool (one per turn):
   - Tool is executed (native or MCP)
   - Result is sent back to Claude
   - Claude continues response
5. Messages are persisted to chat history, including Claude's full response blocks (thinking included), which are sent back unchanged on later turns

## Troubleshooting

### "API key not configured"

Add your Anthropic API key to `.env` or enter it in Settings.

### OAuth connection fails

- Ensure you're connected to the internet
- Check that Day AI is accessible
- Try disconnecting and reconnecting

### MCP tools not appearing

- Verify Day AI connection is active (green icon in Settings)
- Check console for connection errors
- Try disconnecting and reconnecting

## Questions & Support

### Using Claude (Recommended)

The **best way to get help** customizing this app:

```bash
# From the root of the repo
cd ../../  # if you're in examples/desktop
claude
```

Ask Claude anything:
- "How do I change this notes app to track bugs instead?"
- "Show me how to add a new native tool"
- "Help me debug this error: [paste error]"
- "How do I modify the system prompt?"

Claude has full context on this codebase and can help you customize, debug, and ship faster.

## License

MIT - See the main Day AI SDK repository for details.

## Learn More

- [Day AI SDK Documentation](../../README.md)
- [CLAUDE.md](../../CLAUDE.md) - Quick reference for Claude sessions
- [SCHEMA.md](../../SCHEMA.md) - Day AI data model and search syntax
- [TOOLS.md](../../TOOLS.md) - Every Day AI MCP tool and its inputs
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Claude API documentation](https://platform.claude.com/docs)
