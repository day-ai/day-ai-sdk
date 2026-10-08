# Changelog

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
