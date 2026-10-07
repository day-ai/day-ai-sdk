# Day AI SDK

TypeScript client and example apps for Day AI, an AI-native CRM. Day AI's data and actions are exposed as a remote MCP server at `https://day.ai/api/mcp`; this repo wraps it with OAuth, token refresh and typed helpers, and shows how to build on it. Readers range from engineers to RevOps folks building tools with Claude, so keep code and docs plain.

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

## How Day AI works (what agents get wrong)

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
- With the Agent SDK, grant Day AI tools with `allowedTools: ['mcp__<server-name>__*']` rather than `permissionMode: 'bypassPermissions'`.

## Changing this repo

- **When the platform changes:** run `yarn docs:tools`, then update SCHEMA.md and the README by checking the Day AI source or `read_crm_schema` output. Don't document from memory.
- **Keep `src/` small.** Helpers exist for the most common calls; everything else goes through `mcpCallTool()`. New helpers must match the live tool schema (see TOOLS.md) and get a test in `tests/tools/`.
- **Don't run write tools against a real workspace casually.** `create_or_update_*`, campaign and import tools change customer data.
- **Never commit `.env`** or print `CLIENT_SECRET` / `REFRESH_TOKEN`.
- Match the existing style: 2-space indent, single quotes in examples, double quotes in `src/`.
