# Day AI Desktop Demo

> **Best Way to Get Support**: Run `claude` from the root of this repo to ask questions and get help customizing this app.

A fully-featured Electron app demonstrating how to build an AI-powered desktop application that integrates with Day AI via MCP (Model Context Protocol).

This is **not just a demo** - it's a **production-ready template** you can clone and customize to build your own AI-powered tools in minutes.

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
1. Uses Day AI's `search_objects` tool to find John Smith
2. Uses Day AI's `get_context_for_objects` to get full context
3. Uses Day AI's `get_meeting_recording_context` to find recent meetings
4. Uses local `update_note` tool to write the summary to the note
```

## Quick Start

### Prerequisites

- Node.js 18+
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
- Draft and send emails

## Architecture

```
examples/desktop/
├── electron/
│   ├── main.ts              # Electron main process + IPC handlers
│   ├── preload.ts           # Secure IPC bridge
│   └── services/
│       ├── AgentService.ts      # Claude chat with streaming + tools
│       ├── OAuthService.ts      # OAuth 2.0 with PKCE
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
| `OAuthService` | Handles Day AI OAuth 2.0 flow with PKCE |
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
| `search_objects` | Search for People, Organizations, Opportunities |
| `get_context_for_objects` | Get rich context for CRM objects |
| `get_meeting_recording_context` | Get transcripts and summaries from meetings |
| `create_or_update_person_organization` | Create/update CRM records |
| `create_email_draft` | Draft an email |
| `send_email` | Send an email |
| And more... | See Day AI SDK documentation |

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

# Build for production
yarn build

# Package for distribution
yarn package
```

## How It Works

### OAuth 2.0 Flow

1. App requests dynamic client registration from Day AI
2. User is redirected to Day AI authorization page
3. After approval, Day AI redirects to local callback server
4. App exchanges authorization code for tokens
5. Tokens are stored and automatically refreshed

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
4. If Claude calls a tool:
   - Tool is executed (native or MCP)
   - Result is sent back to Claude
   - Claude continues response
5. Messages are persisted to chat history

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
- [SCHEMA.md](../../SCHEMA.md) - Full Day AI object schemas and MCP tools
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Anthropic API Documentation](https://docs.anthropic.com)
