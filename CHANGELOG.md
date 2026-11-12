# Changelog

## Unreleased

### Security

- **OAuth logins now use PKCE (S256).** `yarn oauth:setup` and `day-ai login` send a `code_challenge` on `/integrations/authorize` and the `code_verifier` on the code exchange. The desktop and mobile examples already did. Day AI is about to require PKCE on every authorization-code login, so **upgrade before then**. Existing refresh tokens and `.env` / `~/.config/day-ai` credentials keep working; only new logins change. If you copied the login flow into your own code (Python or anything else), add the two parameters: see [Writing your own login](README.md#writing-your-own-login-python-go-).
- New SDK exports `createPkcePair()`, `pkceChallenge()` and `buildAuthorizeUrl()`, plus offline unit tests (`yarn test:unit`).
- The mobile example generates its OAuth `state` with `expo-crypto` instead of `Math.random()`.

### Added

- **The `day-ai` CLI** (`cli/`). `yarn setup` installs, builds and runs `npm link`. `day-ai login` signs in through the browser and saves credentials to `~/.config/day-ai/credentials.json`, with no `.env` or `INTEGRATION_NAME` needed. `day-ai tools`, `describe` and `call` list, explain and call any MCP tool. Tools that change data are a dry run until `--yes`. Also adds named profiles (`--profile`, `DAY_AI_PROFILE`, `day-ai use`), `day-ai token` for other MCP clients, `status` and `doctor`.
- `DayAIClient` options: `quiet` (no progress logging), `accessToken` / `accessTokenExpiresAt` (start from a cached token), `onTokenRefresh` (persist refreshed tokens) and `clientInfo`.

### Fixed

- `DayAIClient` now keeps a rotated refresh token when the server issues one, instead of continuing to use the old one.

## 0.2.0 — 2026-10

Brings the SDK in line with the current Day AI platform. If you're upgrading, read **Breaking changes**.

### Breaking changes

- **`createPerson()` / `createOrganization()`** now send `objectType: 'native_contact'` / `'native_organization'`. The old `'Person'` / `'Organization'` values are rejected by the server, so these helpers were failing.
- **Input types follow the current schemas.**
  - `CreatePersonInput`: `email` is optional; `jobTitle` → `currentJobTitle`.
  - `CreateOrganizationInput`: `domain` is optional; `revenue` → `annualRevenue`; `url` removed.
  - `CreateOpportunityInput`: adds `organizationId` (preferred), `timeframeStart`, `timeframeEnd`; `domain` is optional; `expectedRevenue`, `expectedCloseDate` and `primaryPerson` removed (read-only or deprecated on the server).
  - `SendNotificationInput`: `slackFormatting` removed.
  - `RelationshipFilter.operator` is `'eq' | 'neq'`.
- **`findMeetingsByAttendee()`** looks up the contact or organization first and searches by its objectId. If the email or domain doesn't match exactly one record, it returns a note listing the candidates instead of meeting results.
- `package.json` `main` / `types` now point at `dist/src/` (they pointed at files that didn't exist).

### Added

- `getAccessToken()` (now public) and `mcpUrl`, for connecting the Claude Agent SDK, the Messages API MCP connector or any MCP client directly.
- Automatic retries for transient server errors, limited to requests that are safe to repeat.
- `ObjectType` covers all 28 searchable types, including `native_emailmessage`, `native_campaign`, `native_folder` and `native_file`.
- New operators (`neq`, `notContains`, `isAnyOf`, `containsAnyOf`, `containsAllOf`), `timeframeField` values `time` / `writtenAt`, and cursor pagination options.
- `yarn docs:tools` regenerates [TOOLS.md](TOOLS.md) from the live server.

### Fixed

- `testConnection()` reported success for invalid credentials.
- Tool results that are plain text (not JSON) no longer throw in the parsed helpers.
- MCP requests send the `Accept` header the protocol requires.
- `yarn test:tool` / `yarn test:file` and the `yarn example:*` scripts work again.

### Deprecated

- `graphql()`: Day AI's GraphQL API doesn't accept integration tokens. Use `mcpCallTool()`.
- `workspaceId` config / `WORKSPACE_ID`: ignored. The workspace is chosen when you authorize.
- `native_gmailthread` / `native_gmailmessage`: use `native_emailmessage`.

### Docs

- README rewritten around four paths: connect Day AI to Claude, build an agent, call from code, vibe code.
- SCHEMA.md rewritten against the current data model; contacts and organizations are keyed by UUID, not email/domain.
- TOOLS.md added (generated).
- Model guidance updated to Claude Sonnet 5.5 / Opus 5.5 / Haiku 5.5.
