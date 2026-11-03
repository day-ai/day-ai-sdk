# Day AI SDK

The Day AI platform as a TypeScript SDK.

Anything you can do in Day AI, you can do with this SDK — search contacts, create opportunities, pull meeting transcripts. Use it like a plain API, build AI-powered tools, or vibe code with Claude.

Day AI exposes your CRM (contacts, companies, opportunities, meetings, emails, pages, campaigns) as a remote **MCP server** at `https://day.ai/api/mcp`. This repo gives you:

- **A TypeScript client** (`DayAIClient`) with OAuth, token refresh and typed helpers
- **Reference docs** for the data model ([SCHEMA.md](SCHEMA.md)) and every tool ([TOOLS.md](TOOLS.md))
- **Example apps** you can clone and adapt

Day AI also hosts your **Second Brain**: deploy a local agent harness of markdown files into [Day AI Pages](#5-deploy-a-second-brain-to-day-ai-pages), where they become a shared, permissioned knowledge graph connected to your CRM.

---

## Pick your path

| You want to… | Start here | Code? |
|---|---|---|
| Ask Claude about your CRM, draft follow-ups, update deals | [1. Connect Day AI to Claude](#1-connect-day-ai-to-claude) | None |
| Build an agent that works with Day AI data | [2. Build an agent](#2-build-an-agent) | A little |
| Script, sync or automate Day AI from your own backend | [3. Call Day AI from code](#3-call-day-ai-from-code) | Yes |
| Have Claude Code build a tool for you | [4. Vibe code with Claude Code](#4-vibe-code-with-claude-code) | Claude writes it |
| Give your agent's markdown "Second Brain" a shared, permissioned home | [5. Deploy a Second Brain to Day AI Pages](#5-deploy-a-second-brain-to-day-ai-pages) | A little |

---

## 1. Connect Day AI to Claude

No SDK needed. Day AI works anywhere Claude supports remote MCP servers.

**Claude (web, desktop and mobile)**
1. Open **Settings → Connectors** and search for **Day AI**. On Team and Enterprise plans, an admin may need to enable it first.
2. Click **Connect**, sign in to Day AI, and choose the workspace and assistant Claude should act as.
3. Ask away: *"What did Acme say about pricing in our last three calls?"*

**Claude Code**

```bash
claude mcp add --transport http day-ai https://day.ai/api/mcp
```

Then run `/mcp` inside Claude Code and follow the browser sign-in. Add `--scope user` to make Day AI available in every project.

**Any other MCP client**

```json
{ "type": "http", "url": "https://day.ai/api/mcp" }
```

The server supports standard MCP OAuth discovery and dynamic client registration, so clients that implement the MCP authorization spec can connect without extra setup.

---

## 2. Build an agent

Most agents don't need custom tool code: hand Claude the Day AI MCP server and let it call the tools itself. You need an access token, which the SDK gets for you.

### Set up credentials (once)

```bash
git clone https://github.com/day-ai/day-ai-sdk
cd day-ai-sdk
yarn install && yarn build

cp .env.example .env      # set INTEGRATION_NAME
yarn oauth:setup          # prints a sign-in URL, then saves credentials to .env
```

Open the printed URL, sign in, and pick the workspace and assistant your integration will act as. The assistant you pick decides which tools are available (see [Plans and tool access](#plans-and-tool-access)).

### Option A — Claude Agent SDK (recommended)

The [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview) runs the whole agent loop for you, including MCP tool discovery, tool search and context management.

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';
import { DayAIClient } from './src'; // run from the day-ai-sdk repo root

const dayai = new DayAIClient();

for await (const message of query({
  prompt: 'Summarize every open opportunity that had a meeting this week, with next steps.',
  options: {
    model: 'claude-sonnet-5-5',
    mcpServers: {
      'day-ai': {
        type: 'http',
        url: dayai.mcpUrl,
        headers: { Authorization: `Bearer ${await dayai.getAccessToken()}` },
      },
    },
    allowedTools: ['mcp__day-ai__*'],
  },
})) {
  if (message.type === 'result' && message.subtype === 'success') {
    console.log(message.result);
  }
}
```

`allowedTools` grants exactly the Day AI tools and nothing else; prefer it over `permissionMode: 'bypassPermissions'`. To keep an agent read-only, list read tools explicitly instead of using the wildcard, e.g. `['mcp__day-ai__search_objects', 'mcp__day-ai__read_crm_schema', 'mcp__day-ai__get_meeting_recording_context']`.

### Option B — Claude API with the MCP connector

For a single request or a server-side workflow, the Messages API can connect to Day AI directly. Anthropic's servers call the Day AI tools; you don't run a tool loop.

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { DayAIClient } from './src'; // run from the day-ai-sdk repo root

const anthropic = new Anthropic();
const dayai = new DayAIClient();

const response = await anthropic.beta.messages.create({
  model: 'claude-sonnet-5-5',
  max_tokens: 16000,
  betas: ['mcp-client-2025-11-20', 'server-side-fallback-2026-07-01'],
  fallbacks: 'default', // if Claude declines a request, retry it on a fallback model
  mcp_servers: [
    {
      type: 'url',
      url: dayai.mcpUrl,
      name: 'day-ai',
      authorization_token: await dayai.getAccessToken(),
    },
  ],
  tools: [{ type: 'mcp_toolset', mcp_server_name: 'day-ai' }],
  messages: [{ role: 'user', content: 'Which deals in Proposal have gone quiet for two weeks?' }],
});

for (const block of response.content) {
  if (block.type === 'text') console.log(block.text);
}
```

Fetch a fresh token for each request: access tokens last about an hour. Check `response.stop_reason` before reading the content — it is `"refusal"` if every model declined. To restrict the agent to a subset of tools, set `default_config: { enabled: false }` on the toolset and enable tools by name in `configs`.

### Option C — Your own tool loop

Use this if you need to inspect or modify every tool call, mix Day AI with your app's own tools, or use a model that can't connect to MCP servers itself. List the tools, pass them to the model, and execute calls with `mcpCallTool()`. The [Desktop](examples/desktop/) and [Community Builder](examples/community-builder/) examples show a complete streaming loop with Claude.

```typescript
const { data } = await dayai.mcpListTools();
const tools = data!.tools.map((t) => ({
  name: t.name,
  description: t.description ?? '',
  input_schema: t.inputSchema,
}));
// …pass `tools` to the model, then for each tool_use block:
const result = await dayai.mcpCallTool(block.name, block.input);
```

When you own the loop with Claude, append the model's full `response.content` (including `thinking` blocks) to the conversation before adding tool results, rather than rebuilding the assistant turn yourself.

### Choosing a model

| Model | Use it for |
|---|---|
| `claude-sonnet-5-5` | The default for Day AI agents: fast, capable, good value |
| `claude-opus-5-5` | Long, multi-step research and planning across many records |
| `claude-haiku-5-5` | High-volume, simple jobs such as classifying or summarizing records in a cron |

Use model aliases exactly as written above — no date suffixes.

### Tips for agents

- **Tell the model about objectIds.** Day AI's own server instructions (sent on `initialize`) already explain this, and Claude clients pass them on. If you write your own system prompt, keep this rule: look a contact or company up by `email` / `domain` first, then use the returned objectId. Never invent one.
- **`read_crm_schema` before unfamiliar queries.** It returns the workspace's real properties, custom properties and search recipes.
- **Expect pagination.** `search_objects` returns `status: "partial"` with a `nextOffset` when there's more.
- **Keep queries focused.** Narrow timeframes and short `propertiesToReturn` lists keep calls fast; very broad queries can time out.
- **Use `get_share_url` for links.** Don't construct Day AI URLs yourself.

---

## 3. Call Day AI from code

For scripts, syncs, backends and cron jobs. Set up credentials as in [section 2](#set-up-credentials-once), then:

```typescript
import { DayAIClient } from './src'; // run from the day-ai-sdk repo root

const client = new DayAIClient(); // reads CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN from .env

// Find a company by domain
const orgs = await client.search('native_organization', {
  propertyId: 'domain', operator: 'eq', value: 'acme.com',
});
const acme = orgs.native_organization.results[0];

// Its opportunities (relationship filters take an objectId, not a domain)
const deals = await client.search(
  'native_opportunity',
  { relationship: 'subject', targetObjectType: 'native_organization',
    targetObjectId: acme.objectId, operator: 'eq' },
  { propertiesToReturn: ['title', 'stageId', 'ownerEmail'] },
);

// Meetings with someone (looks up the contact for you)
const meetings = await client.findMeetingsByAttendee('jane@acme.com', {
  timeframeStart: '2026-09-01',
});

// Create records
await client.createPerson({ email: 'jane@acme.com', firstName: 'Jane', lastName: 'Smith' });
await client.createOpportunity({
  title: 'Acme Enterprise Deal',
  stageId: '<stage objectId>',
  organizationId: acme.objectId,
});
```

Every Day AI tool is available through `mcpCallTool()`:

```typescript
const result = await client.mcpCallTool('get_meeting_recording_context', {
  meetingRecordingId: '<objectId>',
});
```

### Client reference

| Method | What it does |
|---|---|
| `search(objectType, where?, options?)` | `search_objects` for one type; returns parsed JSON |
| `searchObjects(queries, options?)` | Several queries in one call; returns the raw MCP result |
| `findMeetingsByAttendee(emailOrDomain, options?)` | Resolves the contact or company, then finds its meetings |
| `createPerson(input)` / `createOrganization(input)` | Create a contact or company |
| `createOpportunity(input)` | Create an opportunity (`title` and `stageId` required) |
| `sendNotification(input)` | Email or Slack the authorized user (only on plans that include `send_notification_mcp`) |
| `mcpCallTool(name, args)` | Call any tool |
| `mcpListTools()` | The tools your assistant can use |
| `getAccessToken()` / `mcpUrl` | For connecting other MCP clients (see [section 2](#2-build-an-agent)) |
| `testConnection()` | Checks your credentials and prints the workspace |

See [SCHEMA.md](SCHEMA.md) for query syntax and [TOOLS.md](TOOLS.md) for every tool's inputs. Runnable scripts are in [`examples/`](examples/): `mcp-tool-example.ts`, `recent-meetings-context.ts` and `pagination-example.ts`.

---

## 4. Vibe code with Claude Code

Clone the repo, add Day AI to Claude Code, and describe what you want.

```bash
git clone https://github.com/day-ai/day-ai-sdk
cd day-ai-sdk
claude mcp add --transport http day-ai https://day.ai/api/mcp
claude
```

Then try:
- *"Build a weekly pipeline digest that emails me every Monday."*
- *"Make a meeting-prep page generator for tomorrow's external calls."*
- *"Sync closed-won deals from Day AI into our billing system."*

This repo's [CLAUDE.md](CLAUDE.md) gives Claude Code the context it needs about the SDK, and with the MCP server connected it can look at your real data while it builds.

---

## 5. Deploy a Second Brain to Day AI Pages

Many agent setups run on a **"Second Brain"**: a local folder of plain markdown files such as `CLAUDE.md`, playbooks, account notes, decision logs, and running ledgers. The agent reads them to load context and writes back to them to keep state. This works well for one person on one machine. It gets hard once the files have to be shared, organized, kept private, or tied to the people and deals they describe.

**Day AI lets you deploy that Second Brain into the platform.** Pages are built to work as a knowledge graph, and they make a strong home for a collection of flat text files:

| Capability | What it means for your Second Brain |
|---|---|
| **1. Notion-like display and real-time collaborative editing** | Your markdown files appear as clean, formatted documents in Day AI. Teammates can read and edit them together in real time, with no git or sync step. |
| **2. Foldering** | Organize Pages into nested folders that mirror your local directory structure (`accounts/`, `playbooks/`, `ledgers/`), so the hierarchy carries over. |
| **3. Graph associations** | Pages connect to contacts, organizations, and opportunities in the graph. An account brief sits with the account, and a deal ledger sits with the deal, so both people and agents find them in context. |
| **4. Data privacy and sharing permissions** | Pages and folders are private until you share them. Keep personal working notes to yourself, and publish team playbooks to the workspace. |
| **5. Agentic reading and updating** | Agents read and edit Pages through MCP, so Pages can hold durable state such as ledgers, running logs, checklists, and memory, and that state persists across sessions, machines, and users. |

### Deploying a Second Brain to Pages

```typescript
import { readFileSync } from 'fs';
import { marked } from 'marked'; // any markdown → HTML converter
import { DayAIClient } from './src';

const client = new DayAIClient();
// Tool results are a single JSON text block; created objects come back with their objectId
const call = async (tool: string, args: Record<string, any>) =>
  JSON.parse((await client.mcpCallTool(tool, args)).data!.content[0].text);

// 1. Mirror your local folder structure
const brain = await call('create_or_update_folder', { title: 'Second Brain' });
const ledgers = await call('create_or_update_folder', {
  title: 'ledgers', parentFolderId: brain.objectId,
});

// 2. Deploy a markdown file as a Page and file it
const page = await call('create_page', {
  title: 'Deal Ledger',
  pageHtmlContent: await marked(readFileSync('second-brain/ledgers/deals.md', 'utf-8')),
});
await call('move_to_folder', {
  items: [{ objectType: 'native_page', objectId: page.objectId }],
  destinationFolderId: ledgers.objectId,
});

// 3. Agents read state back...
const ledger = await call('read_page', { objectId: page.objectId });

// ...and append to it without resending the whole page
await call('update_page', {
  objectId: page.objectId,
  insertContentHtml: '<p>2026-11-03: Acme moved to Negotiation.</p>',
  insertPosition: 'page_end',
});

// 4. Share with the workspace when it's ready (Pages start private)
await call('update_page', {
  objectId: page.objectId,
  publishedForUserAt: new Date().toISOString(),
});

// 5. Find the Pages connected to a company
const acmePages = await client.search('native_page', {
  relationship: 'related', targetObjectType: 'native_organization',
  targetObjectId: '<organization objectId>', operator: 'eq',
});
```

Your local harness stays the same (markdown in, markdown out). Day AI adds collaboration, structure, graph context, and access control on top. You can also attach a Page or a whole folder to a Day AI skill with `manage_skills`, so the Day AI assistant loads that Second Brain at runtime. See the [Pages & notes](TOOLS.md#pages--notes) and [Folders & files](TOOLS.md#folders--files) tools in TOOLS.md for every option, including targeted edits (`oldContentMatch` / `newContentReplace`) and structured table updates (`tableOperations`) for ledgers.

---

## Example apps

| Example | What it shows | Stack |
|---|---|---|
| [Desktop](examples/desktop/) | Notes app with a Claude chat that can search your CRM | Electron, React, Anthropic SDK |
| [Desktop (Agent SDK)](examples/desktop-claude-agent-sdk/) | The same app built on the Claude Agent SDK | Electron, React, Claude Agent SDK |
| [Community Builder](examples/community-builder/) | Agent that researches and builds a community list in Day AI | Vite, React, Express |
| [Mobile](examples/mobile/) | Mobile chat with Day AI tools | React Native, Expo |
| [Vercel Cron](examples/vercel-weather-cron/) | Scheduled job that notifies you daily | Next.js, Vercel Cron |

Each example has its own README with setup steps.

---

## Plans and tool access

You authorize an integration as a specific **Day AI assistant**. That assistant's plan (Turbo, Professional, Executive or Super) decides which tools appear in `tools/list`. Plans aren't strictly cumulative, and Day AI adds tools regularly, so:

- **`tools/list` is the source of truth.** Call `client.mcpListTools()` or check your MCP client's tool list.
- **[TOOLS.md](TOOLS.md)** documents the tools on a Professional assistant, generated from the live server. Regenerate it for your own assistant with `yarn docs:tools`.
- If a call fails with *"not available for your assistant tier"*, that tool isn't included in your assistant's plan.

Integrations act with the permissions of the user who authorized them, and only within the chosen workspace.

---

## Configuration

| Variable | Description | Default |
|---|---|---|
| `INTEGRATION_NAME` | Name shown on the Day AI consent screen | Required for `oauth:setup` |
| `DAY_AI_BASE_URL` | Day AI URL | `https://day.ai` |
| `CALLBACK_URL` | OAuth redirect used by `oauth:setup` | `http://127.0.0.1:8080/callback` |
| `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN` | OAuth credentials | Written by `oauth:setup` |

The workspace and assistant are chosen on the consent screen and are part of the credentials. To switch workspace or assistant, run `yarn oauth:setup` again. Each run registers a new OAuth client.

Treat `CLIENT_SECRET` and `REFRESH_TOKEN` like passwords: keep them in a secret manager or your platform's environment variables, never in source control or client-side code.

---

## Architecture

```
  Claude (web/desktop/Code)      Your agent / app / cron
            │                             │
            │ OAuth (built in)            │ DayAIClient: OAuth + token refresh
            ▼                             ▼
   ┌───────────────────────────────────────────────┐
   │  Day AI MCP server — https://day.ai/api/mcp   │
   │  Streamable HTTP · JSON-RPC · stateless       │
   │  Tools offered per assistant plan             │
   └───────────────────────────────────────────────┘
                          │
                          ▼
   Contacts · Organizations · Opportunities · Meetings
   Emails · Calendar · Pages · Campaigns · Slack
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Missing required OAuth credentials` | Run `yarn oauth:setup`, or pass `clientId`, `clientSecret` and `refreshToken` to `new DayAIClient()` |
| `Please set INTEGRATION_NAME` | Copy `.env.example` to `.env` and set it |
| `Authorization timeout` | Finish the browser sign-in within 5 minutes |
| `Failed to refresh token: 403` or `404` | The grant was revoked or the client was removed. Run `yarn oauth:setup` again |
| `No agent context found` | Re-authorize and pick an assistant on the consent screen |
| Tool call fails with *"not available for your assistant tier"* | The tool isn't in your assistant's plan. See [Plans and tool access](#plans-and-tool-access) |
| Relationship search returns nothing | `targetObjectId` must be an objectId. Look the contact or company up by `email` / `domain` first ([SCHEMA.md](SCHEMA.md#objectids)) |
| `eq` on a name returns nothing | Names and titles are contains-only. Use `contains` |
| A call times out | Narrow the query: add a timeframe, request fewer properties, or paginate |

---

## Documentation

- **[SCHEMA.md](SCHEMA.md)** — Data model, objectIds, `search_objects` syntax, relationships, recipes
- **[TOOLS.md](TOOLS.md)** — Every MCP tool and its inputs (generated)
- **[CLAUDE.md](CLAUDE.md)** — Context for Claude Code sessions working in this repo
- **[CHANGELOG.md](CHANGELOG.md)** — What changed between SDK versions
- **[tests/README.md](tests/README.md)** — Running the tool tests

## License

MIT — see [LICENSE](LICENSE).
