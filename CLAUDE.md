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

The platform is a remote MCP server at `https://day.ai/api/mcp`. Claude (web, desktop, Claude Code) can also connect to it directly as a connector, with no SDK in between.

## The Object-of-Work Pattern

- Notes app stores freeform text ("Urgent Bugs", "Q1 Opportunities")
- AI agent can read notes AND query Day AI CRM
- User gets answers combining their notes + full CRM context
- Natural language everywhere (no rigid forms)

Every example app is built this way: one object the user works on, an agent that can read and change it, and Day AI for everything around it.

## Example Apps

These are **templates**: clone one and make it yours.

- **Desktop** (`examples/desktop/`) - Electron notes app. Notes list on the left, editor in the center, Claude chat with Day AI tools on the right. The agent loop is hand-written with the Anthropic SDK.
- **Desktop, Agent SDK** (`examples/desktop-claude-agent-sdk/`) - The same app with the Claude Agent SDK running the loop. Note tools run as an in-process MCP server next to Day AI.
- **Vercel Cron** (`examples/vercel-weather-cron/`) - Scheduled workflow that emails you daily through Day AI (`send_notification_mcp`, on plans that include it). The template for digests, reports and alerts.
- **Community Builder** (`examples/community-builder/`) - Vite + Express agent that researches and builds a community list in Day AI.
- **Mobile** (`examples/mobile/`) - React Native / Expo chat with Day AI tools.

### Build New Apps from Template

1. Copy `examples/desktop/` (or `examples/desktop-claude-agent-sdk/`) to a new directory
2. Rename "notes" to your object type (bugs, tasks, etc.)
3. Update tools and UI for your use case
4. Day AI MCP integration works out of the box

## Layout

```
src/client.ts        DayAIClient: OAuth refresh, MCP JSON-RPC, retries, typed helpers
src/types.ts         ObjectType, WhereCondition, SearchOptions, helper input types
scripts/             oauth-setup (browser OAuth → .env), generate-tools-doc (→ TOOLS.md), test runner
tests/tools/         Live tool tests (local Day AI dev server only)
examples/*.ts        Small runnable scripts (built with the SDK: yarn example:*)
examples/<app>/      Standalone template apps, each with its own package.json
SCHEMA.md            Data model, objectIds, search_objects syntax, relationships (hand-written)
TOOLS.md             Every MCP tool and its inputs (generated — don't hand-edit)
```

## Commands

```bash
yarn build                 # tsc → dist/ (src, scripts, tests, examples/*.ts)
yarn oauth:setup           # register a client, authorize in the browser, write .env
yarn docs:tools            # regenerate TOOLS.md from the live server
yarn test                  # live tool tests; local Day AI dev server only (see tests/README.md)
yarn example:mcp <email>   # also example:meetings, example:pagination
```

Each app in `examples/<app>/` installs and runs on its own; see its README.

## How Day AI Works (what agents get wrong)

- **objectIds are opaque UUIDs.** Contacts are not keyed by email, organizations not by domain. Look them up by the `email` / `domain` property, then use the returned `objectId`. The only exception: relationship filters on `native_emailmessage` and `native_calendarevent` take emails and domains.
- **Relationship filters need the right name for the searched type.** Opportunities filter by company with `subject`; meetings by person or company with `attendee`. The full table is in SCHEMA.md.
- **Names and titles are contains-only.** `eq` on `firstName`, `lastName`, organization `name` or opportunity `domain` always returns nothing.
- **Email is `native_emailmessage`.** `native_gmailthread` is deprecated.
- **`read_crm_schema` is the source of truth** for properties, custom properties (UUID ids; picklist values are option UUIDs) and searchable relationships in a given workspace.
- **Tool access depends on the assistant's plan** (Turbo / Professional / Executive / Super), which isn't strictly cumulative. Trust `tools/list`, not a hard-coded list. TOOLS.md was generated on Professional.
- **Keep calls focused** (very broad queries can time out), and remember `search_objects` paginates (`status: "partial"` + `nextOffset`, or cursor mode for big scans).
- Tool results are a single text block, usually JSON. `DayAIClient` parses it in `search()` and the create helpers; `mcpCallTool()` returns it raw.

## Building on the SDK

- **Agents should connect to the MCP server directly** (Claude Agent SDK `mcpServers`, or the Messages API MCP connector) using `client.mcpUrl` and `await client.getAccessToken()`. Write a custom tool loop only when the app needs to intercept calls or mix in its own tools — see `examples/desktop` and `examples/community-builder`.
- **Default model is `claude-sonnet-5-5`**; `claude-opus-5-5` for long multi-step work, `claude-haiku-5-5` for high-volume simple jobs. Use the aliases without date suffixes.
- In a hand-written loop, append the model's full `response.content` (thinking blocks included) to history before tool results. Don't rebuild assistant turns from text.
- With the Agent SDK, expose your app's own tools (the object of work) with `createSdkMcpServer()` and grant every server with `allowedTools: ['mcp__<server-name>__*']` rather than `permissionMode: 'bypassPermissions'`.

## Changing This Repo

- **When the platform changes:** run `yarn docs:tools`, then update SCHEMA.md and the README by checking `read_crm_schema` output and the live tool list. Don't document from memory.
- **Keep `src/` small.** Helpers exist for the most common calls; everything else goes through `mcpCallTool()`. New helpers must match the live tool schema (see TOOLS.md) and get a test in `tests/tools/`.
- **Don't run write tools against a real workspace casually.** `create_or_update_*`, campaign and import tools change customer data.
- **Never commit `.env`** or print `CLIENT_SECRET` / `REFRESH_TOKEN`.
- Match the existing style: 2-space indent, single quotes in examples, double quotes in `src/`.

## Next Steps for New Claude Sessions

1. Read this file for context
2. Check user's specific request
3. If modifying desktop app: understand `electron/services/` and `src/components/`
4. If adding features: check TOOLS.md for available MCP tools and SCHEMA.md for how to query them
5. If building new app: use `examples/desktop/` as template

## Philosophy

This SDK enables developers to build AI-powered tools in minutes, not weeks. The example apps are templates, not demos. Clone, customize, ship.
