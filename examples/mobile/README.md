# Day AI Mobile Example

A Claude chat app for iOS, Android and web that can look things up in your Day AI CRM through Day AI's MCP tools.

Built with Expo 54, React Native 0.81, NativeWind and the Anthropic TypeScript SDK.

## What it does

- Streams Claude responses (Sonnet 5.5 by default; Opus 5.5 and Haiku 5.5 in Settings)
- Connects to Day AI with OAuth from the Settings screen (iOS and Android)
- Offers Day AI's MCP tools to Claude and shows each tool call in the chat
- Saves chat history, settings and credentials on the device

This is a starting point, not a finished product. Before shipping, see [Known limitations](#known-limitations).

## Quick start

Prerequisites: Node.js 18+, an [Anthropic API key](https://console.anthropic.com/), and Xcode or Android Studio for native builds.

```bash
cd examples/mobile
npm install
cp .env.example .env     # set ANTHROPIC_API_KEY (or enter it in Settings later)
```

| Command | Runs |
|---|---|
| `npm run dev` | CORS proxy + web app at http://localhost:8081 |
| `npm run ios` | iOS simulator |
| `npm run android` | Android emulator |
| `npm start` | Expo dev server (scan the QR code with Expo Go) |

### Environment variables

| Variable | Used for | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude requests (can also be set in Settings) | — |
| `PROXY_URL` | Web-only proxy that forwards Claude requests | `http://localhost:3001` |

Day AI credentials aren't configured through `.env`; the app gets them through OAuth.

## Connect Day AI

1. Open **Settings** (gear icon) → **Day AI Connection** → **Connect**.
2. Sign in to Day AI in the browser and pick the workspace and assistant the app should act as.
3. A green **Day AI** indicator appears in the header when you're connected.

The app registers an OAuth client, sends you to `https://day.ai/integrations/authorize` (scope `assistant:*:use`) and stores the refresh token on the device. OAuth runs on iOS and Android only, not web.

The assistant you pick decides which tools Claude can use. See [TOOLS.md](../../TOOLS.md) for the tools and [SCHEMA.md](../../SCHEMA.md) for how Day AI data is shaped.

**Try:**
- "Find the contacts at acme.com"
- "Which opportunities are in the Proposal stage?"
- "What did we discuss in yesterday's meetings?"

Claude finds people and companies by their `email` or `domain` first, then uses the returned objectId for related records. Day AI's MCP server explains this to Claude automatically.

## How it's built

```
src/
├── components/   ChatScreen, MessageBubble, SettingsSheet, ToolCallDisplay, GlassView
├── hooks/        useChat — chat state, streaming, tool execution, persistence
├── services/     ClaudeService (Anthropic API), DayAIService (MCP), OAuthService (Day AI OAuth)
├── lib/          DayAIClient — token refresh + MCP JSON-RPC
├── types/        Shared types, model list
└── config/       env.ts
server/proxy.js   Web-only CORS proxy for the Anthropic API
```

**Chat flow:** `useChat.sendMessage()` gets the Day AI tools from `DayAIService`, streams a Claude response through `ClaudeService`, and runs each `tool_use` it sees through `DayAIService.executeTool()`, showing the result in a `ToolCallDisplay`.

**Changing the model or prompt:** the model list is in `src/types/index.ts` and `SettingsSheet.tsx`; the system prompt is `getSystemPrompt()` in `src/services/ClaudeService.ts`.

## Known limitations

- **Tool results aren't sent back to Claude.** Tool calls run and show up in the UI, but Claude doesn't get a second turn to read the results. To finish the loop, collect the assistant's full `content` blocks (thinking blocks included), append a user turn with `tool_result` blocks, and call Claude again until `stop_reason` isn't `tool_use`. The [Desktop example](../desktop/) and [Community Builder](../community-builder/) show this pattern.
- **The Anthropic API key lives on the device.** For a real app, call Claude from your own backend.
- **The web build needs the proxy** (`npm run proxy`) because browsers block direct Anthropic API calls.

## Troubleshooting

| Problem | Fix |
|---|---|
| "API key not configured" | Set `ANTHROPIC_API_KEY` in `.env` or in Settings |
| Web app can't reach Claude | Start the proxy (`npm run proxy`) and check `PROXY_URL` |
| Day AI connect fails on web | OAuth needs iOS or Android |
| A tool fails with "not available for your assistant tier" | The tool isn't in your assistant's Day AI plan |
| `Cannot find module` | `rm -rf node_modules && npm install`, then `npx expo start -c` |

## Resources

- [Day AI SDK](../../README.md)
- [Claude API docs](https://platform.claude.com/docs)
- [Expo docs](https://docs.expo.dev/)
