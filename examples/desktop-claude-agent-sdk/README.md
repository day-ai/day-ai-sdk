# Day AI Desktop (Claude Agent SDK)

A desktop notes app with a Claude chat that can search and update your Day AI CRM. It's the same app as [`examples/desktop`](../desktop/), but the agent loop runs on the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview) instead of a hand-written tool loop.

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
2. Uses Day AI's `get_meeting_recording_context` to find recent meetings
3. Uses local `update_note` tool to write the summary to the note
```

## How it differs from `examples/desktop`

| | `desktop` | `desktop-claude-agent-sdk` (this one) |
|---|---|---|
| Agent loop | Written in `AgentService.ts` with the Anthropic SDK | Run by the Agent SDK's `query()` |
| Day AI tools | Listed and called by the app | Passed to the SDK as an MCP server; the SDK discovers and calls them |
| Note tools | Anthropic tool definitions, run by the app's loop | An in-process MCP server (`notes`) built with `createSdkMcpServer()` |
| Conversation history | Rebuilt by the app each turn | Kept by the SDK, resumed by session ID |
| Tool permissions | App-defined | `allowedTools: ['mcp__day-ai__*', 'mcp__notes__*']` |

The key code is `buildSdkOptions()` in [`electron/services/AgentService.ts`](electron/services/AgentService.ts):

```typescript
query({
  prompt: message,
  options: {
    model: 'sonnet',                          // or e.g. 'claude-sonnet-5-5'
    mcpServers: {
      'day-ai': {
        type: 'http',
        url: 'https://day.ai/api/mcp',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      notes: createNotesMcpServer(noteId, onNotesChanged), // in-process note tools
    },
    allowedTools: ['mcp__day-ai__*', 'mcp__notes__*'], // auto-approve these servers only
    tools: [],                                // no shell or file tools in a notes app
  },
})
```

## Prerequisites

- Node.js 18+
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))
- **Claude Code installed** (`claude` on your PATH). The app runs agents through it; Settings detects the path automatically.
- A Day AI account (to use the CRM tools)

## Run it

```bash
cd examples/desktop-claude-agent-sdk
npm install
cp .env.example .env     # add ANTHROPIC_API_KEY, or enter it in Settings later
npm run dev
```

Then connect Day AI:

1. Open **Settings** (gear icon) and check the Claude Code path.
2. Under Integrations, click **Connect** next to Day AI.
3. Sign in in your browser and pick the workspace and assistant to use.

Back in the app, ask things like *"Who at Acme have I met with this month?"* or *"Add the next steps from today's Acme call to this note."*

## What the agent can use

- **Day AI tools** — everything your assistant's plan includes. See [TOOLS.md](../../TOOLS.md) for the full list and [SCHEMA.md](../../SCHEMA.md) for how to search.
- **The current note** — its title and contents are added to the system prompt.
- **Note tools** — `update_note` (edits the open note), `search_notes`, `create_note` and `read_note`. They run in-process as the `notes` MCP server ([`notesMcpServer.ts`](electron/services/notesMcpServer.ts)), which wraps the same handlers the `desktop` example uses. The editor and sidebar refresh after a successful edit or new note.

To add your own tools for a different object of work, add another `tool()` to `createNotesMcpServer()` (or create your own server the same way). `allowedTools` picks up every server in `mcpServers` automatically.

## Tips for Day AI prompts

- Contacts and companies have UUID objectIds. Have the agent look people up by `email` and companies by `domain` first, then use the returned objectId in relationship filters. Day AI's server instructions tell Claude this automatically.
- Access tokens last about an hour. The app refreshes them, and each message you send passes the current token to the Agent SDK.
- Narrow, focused searches work better than broad ones, which can time out.

## Project layout

```
electron/
  main.ts                    Electron main process, IPC, chat history
  services/
    AgentService.ts          Agent SDK query() setup and streaming
    MCPClientService.ts      Day AI MCP connection (tool list, token refresh)
    OAuthService.ts          Day AI OAuth (dynamic registration, browser sign-in)
    notesMcpServer.ts        Note tools as an in-process MCP server for the Agent SDK
    ToolExecutor.ts, tools.ts  Note tool handlers and descriptions
src/                         React UI (notes list, editor, chat, settings)
```

## Troubleshooting

| Problem | Fix |
|---|---|
| "Claude Code CLI path not configured" | Install Claude Code, then set or detect the path in Settings |
| "Anthropic API key not configured" | Add `ANTHROPIC_API_KEY` to `.env` or enter it in Settings |
| Day AI tools never get called | Check Settings shows Day AI as connected; reconnect if the token was revoked |
| "not available for your assistant tier" | That tool isn't in your Day AI assistant's plan |

