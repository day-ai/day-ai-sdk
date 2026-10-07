# Day AI Desktop (Claude Agent SDK)

A desktop notes app with a Claude chat that can search and update your Day AI CRM. It's the same app as [`examples/desktop`](../desktop/), but the agent loop runs on the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview) instead of a hand-written tool loop.

## How it differs from `examples/desktop`

| | `desktop` | `desktop-claude-agent-sdk` (this one) |
|---|---|---|
| Agent loop | Written in `AgentService.ts` with the Anthropic SDK | Run by the Agent SDK's `query()` |
| Day AI tools | Listed and called by the app | Passed to the SDK as an MCP server; the SDK discovers and calls them |
| Conversation history | Rebuilt by the app each turn | Kept by the SDK, resumed by session ID |
| Tool permissions | App-defined | `allowedTools: ['mcp__day-ai__*']` |

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
    },
    allowedTools: ['mcp__day-ai__*'],        // auto-approve Day AI tools only
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

> The note tools in `electron/services/tools.ts` (`update_note`, `create_note`, …) aren't registered with the Agent SDK yet, so Claude can read the current note but not edit it. To add them, wrap the handlers in `ToolExecutor.ts` with the SDK's `createSdkMcpServer()` and `tool()`, add the server to `mcpServers`, and allow it with `mcp__<server-name>__*`.

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
    ToolExecutor.ts, tools.ts  Note tools (see note above)
src/                         React UI (notes list, editor, chat, settings)
```

## Troubleshooting

| Problem | Fix |
|---|---|
| "Claude Code CLI path not configured" | Install Claude Code, then set or detect the path in Settings |
| "Anthropic API key not configured" | Add `ANTHROPIC_API_KEY` to `.env` or enter it in Settings |
| Day AI tools never get called | Check Settings shows Day AI as connected; reconnect if the token was revoked |
| "not available for your assistant tier" | That tool isn't in your Day AI assistant's plan |

