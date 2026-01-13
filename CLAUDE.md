# Day AI SDK - Claude Context

## What This Is

**Day AI SDK** is a TypeScript/Node.js SDK for building AI-native applications that integrate with Day AI's CRM platform. This repo provides:

1. **Core SDK** (`src/`) - OAuth 2.0 + MCP client for Day AI platform
2. **Example Apps** (`examples/`) - Reusable templates for building AI-powered tools

## The Vision

Day AI is an **AI-native CRM** with rich contextual business data (contacts, opportunities, meetings). This SDK enables developers to build specialized **object-of-work interfaces** that are deeply integrated with the CRM from day one.

Instead of standalone apps, developers clone example templates and build tools that can instantly query Day AI for context across contacts, opportunities, meetings, and more - all in natural language optimized for LLM agents.

## Architecture

```
User's App (Electron/CLI/Web)
    ↓
Day AI SDK (OAuth + MCP Client)
    ↓
Day AI Platform (AI-native CRM)
    ↓ (MCP Tools)
Contacts, Opportunities, Meetings, Pages, etc.
```

## Key Components

### Core SDK (`src/`)
- **DayAIClient**: OAuth 2.0 with auto token refresh
- **MCP Tools**: 20+ tools for CRM operations (search, create, update, get context)
- Full TypeScript types and error handling

### Example 1: Desktop App (`examples/desktop/`)
- **Electron** app with React + TypeScript + Tailwind
- **Left sidebar**: Notes list (CRUD operations)
- **Center**: Rich text editor for notes
- **Right sidebar**: Claude AI chat with streaming
- **MCP Integration**: AI agent can query Day AI CRM via MCP tools
- **Native Tools**: AI can read/update notes directly

This is a **template** - clone it to build bug trackers, opportunity managers, meeting prep tools, etc.

### Example 2: Vercel Weather Cron (`examples/vercel-weather-cron/`)
- **Next.js** app with Vercel Cron Jobs
- **Automated workflow**: Fetches weather daily at 9 AM
- **Email notification**: Uses Day AI's `send_notification` MCP tool
- **Simple dashboard**: Manual trigger and status display
- **Zero server management**: Runs on Vercel's edge

This is a **template** - clone it to build daily digests, scheduled reports, monitoring alerts, data enrichment crons, etc.

## File Structure

```
day-ai-sdk/
├── src/                 # Core SDK
│   ├── DayAIClient.ts   # Main client with OAuth + MCP
│   └── types.ts         # TypeScript types
├── examples/
│   ├── desktop/         # Electron notes app (template)
│   │   ├── electron/    # Main process (IPC, services)
│   │   │   ├── main.ts
│   │   │   └── services/
│   │   │       ├── AgentService.ts      # Claude SDK integration
│   │   │       ├── OAuthService.ts      # Day AI OAuth
│   │   │       ├── MCPClientService.ts  # MCP client
│   │   │       └── ToolExecutor.ts      # Native + MCP tool execution
│   │   └── src/         # Renderer (React UI)
│   │       ├── App.tsx
│   │       └── components/
│   └── vercel-weather-cron/  # Vercel cron automation (template)
│       ├── app/
│       │   ├── page.tsx             # Dashboard UI
│       │   └── api/
│       │       ├── cron/weather/    # Cron job endpoint
│       │       └── manual-sync/     # Manual trigger
│       ├── lib/
│       │   ├── dayai.ts             # Day AI client
│       │   └── weather.ts           # Weather API
│       └── vercel.json              # Cron config
├── scripts/
│   └── oauth-setup.ts   # CLI OAuth wizard
└── SCHEMA.md            # Day AI object schemas
```

## Common Tasks

### Run the Desktop Example
```bash
cd examples/desktop
npm install
npm run dev
```

### Run the Vercel Example Locally
```bash
cd examples/vercel-weather-cron
npm install
npm run dev
# Visit http://localhost:3000
```

### Deploy Vercel Example
```bash
cd examples/vercel-weather-cron
vercel
# Set environment variables in Vercel dashboard
```

### Add/Modify Features
- **Add native tools**: Edit `electron/services/tools.ts`
- **Modify UI**: Edit `src/components/`
- **Change agent behavior**: Edit `electron/services/AgentService.ts`

### Build New Apps from Template
1. Copy `examples/desktop/` to a new directory
2. Rename "notes" to your object type (bugs, tasks, etc.)
3. Update tools and UI for your use case
4. Day AI MCP integration works out of the box

## MCP Tools Available

Day AI provides 20+ MCP tools including:

### Search & Query
- `search_objects` - **Primary search tool** with property AND relationship filtering
  - Search by properties: `{propertyId, operator, value}`
  - Search by relationships: `{relationship, targetObjectType, targetObjectId, operator}`
  - Use `includeRelationships: true` to see connected objects
  - Use `propertiesToReturn: '*'` for all properties
- `keyword_search` - Simple keyword-based search

### CRM Operations
- `create_or_update_person_organization` - CRUD for contacts/companies
- `create_or_update_opportunity` - CRUD for deals
- `get_meeting_recording_context` - Meeting transcripts

### Key Search Patterns

**Find meetings by attendee (relationship search):**
```typescript
{
  queries: [{
    objectType: 'native_meetingrecording',
    where: {
      relationship: 'attendee',
      targetObjectType: 'native_contact',
      targetObjectId: 'john@acme.com',  // email for contacts
      operator: 'eq'
    }
  }],
  includeRelationships: true
}
```

**Find meetings with a company:**
```typescript
{
  queries: [{
    objectType: 'native_meetingrecording',
    where: {
      relationship: 'attendee',
      targetObjectType: 'native_organization',
      targetObjectId: 'acme.com',  // domain for orgs
      operator: 'eq'
    }
  }],
  includeRelationships: true
}
```

**Find notes on an organization:**
```typescript
{
  queries: [{
    objectType: 'native_context',
    where: {
      relationship: 'parent',
      targetObjectType: 'native_organization',
      targetObjectId: 'acme.com',
      operator: 'eq'
    }
  }],
  includeRelationships: true
}
```

See SCHEMA.md for full tool list and relationship definitions.

## Important Patterns

### OAuth Flow
1. User clicks "Connect to Day AI"
2. SDK registers OAuth client dynamically
3. Opens browser for authorization
4. Exchanges code for tokens
5. Auto-refreshes tokens on each request

### Tool Execution Pattern
1. User sends message to AI
2. Claude responds with tool call(s)
3. ToolExecutor checks: native tool or MCP tool?
4. Executes tool and returns result
5. Claude processes result and responds

### Object-of-Work Pattern
- Notes app stores freeform text ("Urgent Bugs", "Q1 Opportunities")
- AI agent can read notes AND query Day AI CRM
- User gets answers combining their notes + full CRM context
- Natural language everywhere (no rigid forms)

## Key Files to Know

- `src/DayAIClient.ts` - Core SDK client
- `examples/desktop/electron/services/AgentService.ts` - Claude integration
- `examples/desktop/electron/services/ToolExecutor.ts` - Tool execution logic
- `examples/desktop/src/components/ChatPane.tsx` - Chat UI with streaming
- `SCHEMA.md` - Full Day AI API documentation

## Development Tips

- **OAuth**: Run `yarn oauth:setup` in root to get credentials
- **Hot reload**: Vite + Electron run together, UI hot reloads automatically
- **Debugging**: Check Electron DevTools (Cmd+Option+I) for renderer logs
- **Tool errors**: Check main process console for IPC/tool execution errors
- **MCP issues**: Verify OAuth tokens are valid, check network tab

## Common Issues

1. **MCP connection fails**: Re-run OAuth setup, check network
2. **Tools not working**: Verify Anthropic API key in Settings
3. **Port in use**: Kill process on 5173/5174/5175, or change port in vite.config.ts
4. **Type errors**: Run `npm run build` to regenerate types

## Next Steps for New Claude Sessions

1. Read this file for context
2. Check user's specific request
3. If modifying desktop app: understand `electron/services/` and `src/components/`
4. If adding features: check SCHEMA.md for available MCP tools
5. If building new app: use `examples/desktop/` as template

## Philosophy

This SDK enables developers to build AI-powered tools in minutes, not weeks. The example apps are templates, not demos. Clone, customize, ship.
