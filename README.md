# Day AI SDK

The Day AI platform as a TypeScript SDK.

Anything you can do in Day AI, you can do with this SDK — search contacts, create opportunities, pull meeting transcripts. Use it like a plain API, build AI-powered tools, or vibe code with Claude.

## Get Started

```bash
git clone https://github.com/day-ai/day-ai-sdk
cd day-ai-sdk
yarn install && yarn build

# Set up OAuth credentials
cp .env.example .env
# Edit .env: set INTEGRATION_NAME
yarn oauth:setup
```

This registers your OAuth client, opens your browser for authorization, and saves credentials to `.env`.

---

## Choose Your Path

### 1. Use as an API

For scripts, backends, cron jobs, and anywhere you'd use a REST API.

```typescript
import { DayAIClient } from './src';

const client = new DayAIClient();

// Search for contacts
const contacts = await client.search('native_contact', {
  propertyId: 'email', operator: 'contains', value: '@acme.com'
});

// Find meetings with someone
const meetings = await client.search('native_meetingrecording', {
  relationship: 'attendee',
  targetObjectType: 'native_contact',
  targetObjectId: 'john@acme.com',
  operator: 'eq'
}, { includeRelationships: true });

// Create a contact
await client.createPerson({
  email: 'jane@acme.com',
  firstName: 'Jane',
  lastName: 'Smith'
});

// Create an opportunity
await client.createOpportunity({
  title: 'Acme Enterprise Deal',
  stageId: 'stage-id',
  domain: 'acme.com',
  expectedRevenue: 50000
});

// Send a notification
await client.sendNotification({
  channel: 'email',
  emailSubject: 'Daily Pipeline Summary',
  emailBody: '<h1>3 deals closing this week</h1>',
  reasoning: 'Weekly pipeline digest'
});
```

Under the hood, these call MCP tools on the Day AI platform. For full control, use `mcpCallTool()` directly:

```typescript
const result = await client.mcpCallTool('search_objects', {
  queries: [{ objectType: 'native_contact' }],
  propertiesToReturn: '*'
});
```

See [SCHEMA.md](SCHEMA.md) for the full tool & schema reference.

### 2. Build AI-Powered Tools

For developers building apps with Claude, GPT, or other LLMs.

MCP tools are your LLM's toolkit. The pattern:

```typescript
import { DayAIClient } from './src';
import Anthropic from '@anthropic-ai/sdk';

const client = new DayAIClient();
const anthropic = new Anthropic();

// 1. Get tool definitions from Day AI
const toolsResult = await client.mcpListTools();
const tools = toolsResult.data!.tools;

// 2. Pass tools to your LLM
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: 'Find all meetings with Acme last month' }],
  tools: tools.map(t => ({
    name: t.name,
    description: t.description ?? '',
    input_schema: t.inputSchema
  }))
});

// 3. Execute whatever the LLM asks for
for (const block of response.content) {
  if (block.type === 'tool_use') {
    const result = await client.mcpCallTool(block.name, block.input as Record<string, any>);
    // Feed result back to the LLM for the next turn
  }
}
```

See the example apps for complete implementations: [Desktop](examples/desktop/), [Desktop Claude Agent SDK](examples/desktop-claude-agent-sdk/), [Community Builder](examples/community-builder/), [Mobile](examples/mobile/).

### 3. Vibe Code with Claude

Clone a template. Open Claude Code. Describe what you want.

```bash
git clone https://github.com/day-ai/day-ai-sdk
cd day-ai-sdk/examples/desktop
claude
```

Then ask:
- "Build a bug tracker with CRM integration"
- "Add Slack notifications when deals close"
- "Show meeting prep for tomorrow's calls"

The AI agent has full context on the SDK and all available MCP tools.

---

## Example Templates

| Template | Description | Stack | Run |
|----------|-------------|-------|-----|
| [Desktop](examples/desktop/) | Notes app with AI chat + CRM | Electron, React, Claude SDK | `cd examples/desktop && npm run dev` |
| [Desktop Agent SDK](examples/desktop-claude-agent-sdk/) | Desktop app using Claude Agent SDK | Electron, React, Agent SDK | `cd examples/desktop-claude-agent-sdk && npm run dev` |
| [Community Builder](examples/community-builder/) | Community management tool | Next.js | `cd examples/community-builder && npm run dev` |
| [Mobile](examples/mobile/) | Mobile app with OAuth deep linking | React Native, Expo | `cd examples/mobile && npm run ios` |
| [Vercel Cron](examples/vercel-weather-cron/) | Automated daily workflows | Next.js, Vercel Cron | `cd examples/vercel-weather-cron && npm run dev` |

---

## Available MCP Tools

Day AI exposes 20+ tools through MCP:

| Category | Tools |
|----------|-------|
| **Search** | `search_objects`, `keyword_search` |
| **CRM** | `create_or_update_person_organization`, `create_or_update_opportunity`, `update_object` |
| **Content** | `create_page`, `update_page`, `create_email_draft`, `send_email` |
| **Meetings** | `get_meeting_recording_context`, `create_meeting_recording_clip` |
| **Actions** | `create_or_update_action` |
| **Views** | `create_view`, `create_chart` |
| **Notifications** | `send_notification` |
| **Utility** | `web_search`, `get_share_url`, `create_custom_property` |

See [SCHEMA.md](SCHEMA.md) for complete tool documentation, input schemas, and object relationships.

---

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `INTEGRATION_NAME` | Your integration name | Required |
| `DAY_AI_BASE_URL` | Day AI instance URL | `https://day.ai` |
| `CLIENT_ID` | OAuth client ID | Auto-populated |
| `CLIENT_SECRET` | OAuth client secret | Auto-populated |
| `REFRESH_TOKEN` | OAuth refresh token | Auto-populated |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Your Application                     │
│  (Desktop / Mobile / Web / CLI / Cron / Claude Desktop) │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      Day AI SDK                          │
│  • Typed convenience methods (search, create, notify)   │
│  • Raw MCP access (mcpCallTool for full control)        │
│  • OAuth 2.0 with auto token refresh                    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Day AI Platform                        │
│  • AI-native CRM                                        │
│  • 20+ MCP tools                                        │
│  • Full relationship graph                              │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Business Graph                        │
│  Contacts ↔ Organizations ↔ Opportunities ↔ Meetings    │
│  Transcripts ↔ Emails ↔ Slack ↔ Calendar                │
└─────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Please set INTEGRATION_NAME" | Copy `.env.example` to `.env` and set the variable |
| "Authorization timeout" | Complete browser auth within 5 minutes |
| "Connection failed" | Verify Day AI URL and network connectivity |
| OAuth tokens expired | Run `yarn oauth:setup` again |

---

## Documentation

- **[SCHEMA.md](SCHEMA.md)** — Object schemas, MCP tool documentation, relationships
- **[CLAUDE.md](CLAUDE.md)** — Context for Claude sessions

---

## License

MIT License - see LICENSE file for details.
