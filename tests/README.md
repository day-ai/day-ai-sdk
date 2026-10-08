# MCP Tool Tests

Live tests for Day AI MCP tools. They make real MCP calls with the OAuth credentials in `.env`.

> **These tests run only against a local Day AI development server** (`DAY_AI_BASE_URL=http://localhost:8910`). Several tests create or update records, so the runner refuses to run against `https://day.ai`. If you're building on Day AI rather than developing it, use the read-only examples instead (`yarn example:mcp`, `yarn example:meetings`, `yarn example:pagination`).

## Layout

One file per tool in `tests/tools/`, named after the tool with dashes (`search_objects` → `search-objects.ts`). Each file exports one or more test cases: `testCase`, `testCase1`, `testCase2`, …

| File | Tool |
|---|---|
| `search-objects.ts` | `search_objects` |
| `read-crm-schema.ts` | `read_crm_schema` |
| `create-or-update-person-organization.ts` | `create_or_update_person_organization` |
| `create-or-update-opportunity.ts` | `create_or_update_opportunity` |
| `create-or-update-action.ts` | `create_or_update_action` |
| `create-or-update-workspace-context.ts` | `create_or_update_workspace_context` |
| `create-email-draft.ts` | `create_email_draft` |
| `page-operations.ts` | `create_page`, `read_page`, `update_page` |
| `analyze-pipeline-metrics.ts` | `analyze_pipeline_metrics` (only on plans that include it) |

## Running

```env
# .env
DAY_AI_BASE_URL=http://localhost:8910
```

```bash
yarn test                                      # every test file
yarn test:tool search_objects                  # one tool (search-objects also works)
yarn test:file tests/tools/search-objects.ts   # one file
```

All three build first, then run the compiled tests from `dist/`.

## Writing a test

```typescript
// tests/tools/search-objects.ts
export const testCase9 = {
  name: 'search_objects - Contacts at a domain',
  description: 'Filters contacts by email domain',
  toolName: 'search_objects',

  input: {
    queries: [{
      objectType: 'native_contact',
      where: { propertyId: 'email', operator: 'contains', value: '@example.com' },
    }],
    propertiesToReturn: ['email', 'firstName', 'lastName'],
  },

  async validate(result: any) {
    const parsed = JSON.parse(result.data.content[0].text);
    if (!Array.isArray(parsed.native_contact?.results)) {
      throw new Error('Expected native_contact.results to be an array');
    }
    return true;
  },
};
```

- `input` must match the tool's current schema. Check [TOOLS.md](../TOOLS.md), or `read_crm_schema` for property names.
- `validate` receives the raw MCP response (`{ success, data: { content: [{ type, text }], isError? } }`). Throw to fail.
- Use objectIds from earlier searches for relationship filters, never emails or domains (except on `native_emailmessage` and `native_calendarevent`).
- Don't depend on specific records existing. Check shapes, not exact counts.

## Troubleshooting

| Message | Fix |
|---|---|
| `SAFETY CHECK FAILED: Tests can only run against localhost!` | Point `DAY_AI_BASE_URL` at your local server |
| `Missing required OAuth credentials` | Run `yarn oauth:setup` against your local server |
| `not available for your assistant tier` | The tool isn't in the plan of the assistant you authorized |
| `Found 0 test files` | Check the tool name matches the file name |
