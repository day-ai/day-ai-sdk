# Day AI SDK

**Build AI-powered business tools in minutes, not months.**

One command. Full MCP client. Complete CRM integration. Your app instantly queries contacts, opportunities, meetings, and more—all through natural language.

```bash
git clone https://github.com/day-ai/day-ai-sdk
cd day-ai-sdk
claude   # Ask Claude to help you build
```

---

## What You Get

Clone this repo and you have:

- **Full MCP Client** — Model Context Protocol integration, ready for Claude Desktop or any MCP-enabled system
- **20+ CRM Tools** — Search, create, update contacts, opportunities, meetings, transcripts
- **OAuth 2.0** — Automatic token refresh, zero auth code to write
- **Production Templates** — Desktop (Electron), Mobile (React Native), Web/Cron (Vercel)
- **Claude AI Integration** — Streaming responses, tool use, thinking mode

## The Power

Traditional CRM integrations take months. Day AI SDK inverts this:

```
Your App
    ↓
Day AI SDK (OAuth + MCP)
    ↓
Day AI Platform (AI-native CRM)
    ↓
Contacts, Opportunities, Meetings, Transcripts...
```

Your app can ask questions like:
- *"Who reported this bug? Pull their contact history."*
- *"What opportunities are blocked by this?"*
- *"When did we discuss this in meetings?"*

The AI agent traverses the entire business graph. No custom integrations. No API mapping. Just natural language.

---

## Quick Start

### Option 1: Use Claude Code (Recommended)

```bash
git clone https://github.com/day-ai/day-ai-sdk
cd day-ai-sdk
claude
```

Ask Claude:
- "How do I run the desktop example?"
- "Help me build a bug tracker with CRM integration"
- "Show me how the OAuth flow works"

Use `/app` to get guided through building a new application from scratch.

### Option 2: Run an Example

**Desktop App** (Electron + React + Claude):
```bash
cd examples/desktop
npm install
npm run dev
```

**Vercel Cron** (Automated workflows):
```bash
cd examples/vercel-weather-cron
npm install
npm run dev
```

### Option 3: Use the SDK Directly

```bash
# Clone and build the SDK
git clone https://github.com/day-ai/day-ai-sdk
cd day-ai-sdk
yarn install && yarn build
```

```typescript
import { DayAIClient } from './src';

const client = new DayAIClient();
await client.mcpInitialize();

// Search for contacts
const contacts = await client.mcpCallTool('search_objects', {
  queries: [{
    objectType: 'native_contact',
    where: {
      propertyId: 'email',
      operator: 'contains',
      value: '@acme.com'
    }
  }]
});

// Find meetings with a company
const meetings = await client.mcpCallTool('search_objects', {
  queries: [{
    objectType: 'native_meetingrecording',
    where: {
      relationship: 'attendee',
      targetObjectType: 'native_organization',
      targetObjectId: 'acme.com',
      operator: 'eq'
    }
  }],
  includeRelationships: true
});
```

---

## Example Templates

### Desktop Notes App

A fully-featured **Electron desktop app**—not a demo, a production template.

| Feature | Description |
|---------|-------------|
| **3-Panel Layout** | Notes list, rich editor, AI chat |
| **Claude Integration** | Streaming responses with tool use |
| **MCP Tools** | AI queries Day AI CRM automatically |
| **Native Tools** | AI can read/update local notes |

**Clone it to build:** Bug trackers, opportunity managers, meeting prep tools, task lists.

```bash
cd examples/desktop && npm install && npm run dev
```

### Vercel Weather Cron

A **serverless automation template**—daily jobs with zero infrastructure.

| Feature | Description |
|---------|-------------|
| **Vercel Cron** | Runs daily at 9 AM |
| **MCP Integration** | Uses `send_notification` tool |
| **One-Click Deploy** | Environment variables in Vercel dashboard |

**Clone it to build:** Daily digests, scheduled reports, monitoring alerts, data enrichment.

```bash
cd examples/vercel-weather-cron && npm install && npm run dev
```

### Mobile App

A **React Native** template with OAuth deep linking and AsyncStorage persistence.

```bash
cd examples/mobile && npm install && npm run ios
```

---

## OAuth Setup

Before using the SDK, you need Day AI credentials:

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Set your integration name
# Edit .env: INTEGRATION_NAME=My Custom Integration

# 3. Run OAuth wizard
yarn oauth:setup
```

This registers your OAuth client, opens your browser for authorization, and saves credentials to `.env`.

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

## Key Patterns

### Search by Property

```typescript
// Find contacts by email domain
await client.mcpCallTool('search_objects', {
  queries: [{
    objectType: 'native_contact',
    where: {
      propertyId: 'email',
      operator: 'contains',
      value: '@company.com'
    }
  }]
});
```

### Search by Relationship

```typescript
// Find meetings with a specific person
await client.mcpCallTool('search_objects', {
  queries: [{
    objectType: 'native_meetingrecording',
    where: {
      relationship: 'attendee',
      targetObjectType: 'native_contact',
      targetObjectId: 'john@acme.com',
      operator: 'eq'
    }
  }],
  includeRelationships: true
});
```

### Pagination

```typescript
let offset = undefined;
let hasMore = true;

while (hasMore) {
  const response = await client.mcpCallTool('search_objects', {
    offset,
    queries: [{ objectType: 'native_contact' }]
  });

  const data = JSON.parse(response.data?.content[0]?.text);
  // Process data.native_contact.results

  hasMore = data.hasMore;
  offset = data.nextOffset;
}
```

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
│  • OAuth 2.0 with auto token refresh                    │
│  • MCP client (Model Context Protocol)                  │
│  • TypeScript types                                     │
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

## File Structure

```
day-ai-sdk/
├── src/
│   ├── client.ts          # DayAIClient (OAuth + MCP)
│   └── index.ts           # Exports
├── examples/
│   ├── desktop/           # Electron + React + Claude SDK
│   ├── desktop-claude-agent-sdk/  # Electron + Claude Agent SDK
│   ├── mobile/            # React Native + Expo
│   └── vercel-weather-cron/ # Next.js + Vercel Cron
├── scripts/
│   └── oauth-setup.ts     # OAuth wizard
├── SCHEMA.md              # Object schemas + tool documentation
└── CLAUDE.md              # Context for Claude sessions
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
- **[examples/desktop/README.md](examples/desktop/README.md)** — Desktop app details

---

## Support

The best way to get help:

```bash
cd day-ai-sdk
claude
```

Ask anything:
- "How do I add a new MCP tool call?"
- "Help me debug this error: [paste error]"
- "How do I make a desktop app for [use case]?"

---

## License

MIT License - see LICENSE file for details.
