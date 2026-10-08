# Community Builder

A signup form that hands each new community member to a Claude agent. The agent adds or updates them in Day AI, links their company, saves what they can help with and what they need as notes, and replies with a short welcome that points out useful connections already in your CRM.

**Stack:** Vite + React front end, Express back end, Anthropic SDK (`claude-sonnet-5-5`) and the Day AI SDK from this repo.

> This example **creates and updates CRM records**. Point it at a test workspace (or a test assistant) until you're happy with what it writes.

## Setup

1. Get Day AI credentials from the repo root:

   ```bash
   cd ../..
   yarn install && yarn build
   cp .env.example .env    # set INTEGRATION_NAME
   yarn oauth:setup
   ```

2. Configure this example:

   ```bash
   cd examples/community-builder
   cp .env.example .env
   ```

   | Variable | Value |
   |---|---|
   | `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN` | Copy from the root `.env` |
   | `ANTHROPIC_API_KEY` | Your Anthropic API key |
   | `DAY_AI_BASE_URL` | Optional, defaults to `https://day.ai` |

3. Install and run:

   ```bash
   yarn install
   yarn dev        # Express on :3001 and Vite on :5790
   ```

   Open http://localhost:5790. `yarn dev:server` and `yarn dev:client` run the halves separately; `yarn build` typechecks and builds the front end.

## How it works

`server/agent.ts` runs a hand-written tool loop:

1. Lists the Day AI tools your assistant can use (`mcpListTools()`) and passes them to Claude.
2. Streams Claude's response to the browser over server-sent events.
3. Runs each `tool_use` block with `mcpCallTool()` and returns the result, appending Claude's full response (including thinking blocks) to the history first.
4. Stops when Claude finishes, declines, or after 10 iterations.

The tools it typically uses:

| Tool | Why |
|---|---|
| `read_crm_schema` | Learn the contact and organization fields in your workspace |
| `search_objects` | Find an existing contact by `email` and company by `domain` |
| `create_or_update_person_organization` | Create or update the contact and organization (`native_contact` / `native_organization`) |
| `create_or_update_workspace_context` | Save the member's "how I can help" and "where I need help" notes |

Contacts and organizations have UUID objectIds. The system prompt tells Claude to look them up by email or domain and reuse the returned objectId, never to construct one.

To change what the agent does, edit `SYSTEM_PROMPT` in `server/agent.ts`. If you don't need to intercept tool calls, the Agent SDK pattern in the [root README](../../README.md#2-build-an-agent) does the same with less code.

## Reference

- [TOOLS.md](../../TOOLS.md) — every Day AI tool and its inputs
- [SCHEMA.md](../../SCHEMA.md) — data model, objectIds and search syntax
