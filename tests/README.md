# Day AI SDK - MCP Tool Tests

This directory contains test cases for validating Day AI MCP tools using real OAuth authentication and your actual workspace data.

## Structure

Each file in `tests/tools/` represents **one tool** and contains **multiple test cases**:

```
tests/
├── README.md                          # This file
├── runner.ts                          # Test execution engine
└── tools/                             # Tool test cases
    ├── search-objects.ts              # 5 tests for search_objects
    ├── read-crm-schema.ts             # 3 tests for read_crm_schema
    └── get-context-for-objects.ts     # 1 test for get_context_for_objects
```

## How Tests Work

1. **Real Authentication**: Uses your OAuth credentials from `.env`
2. **Real Data**: Tests run against your actual workspace data
3. **Real MCP Calls**: Makes HTTP requests to the MCP endpoint
4. **Multiple Test Cases**: Each file can export `testCase1`, `testCase2`, etc.
5. **Safety First**: Tests **only run against localhost** - production is blocked

## Running Tests

**IMPORTANT**: Tests only run against localhost for safety!

Make sure your `.env` has:
```env
DAY_AI_BASE_URL=http://localhost:8910
```

Then run:
```bash
# Run all tests
yarn test

# Run tests for a specific tool
yarn test:tool search-objects

# Run a specific test file
yarn test:file tests/tools/search-objects.ts
```

If you try to run tests against production, you'll get:
```
❌ SAFETY CHECK FAILED: Tests can only run against localhost!
   Current DAY_AI_BASE_URL: https://day.ai
   Change .env to: DAY_AI_BASE_URL=http://localhost:8910
```

## Creating New Tests

### Option 1: Add to Existing Tool File

Add a new test case to an existing file:

```typescript
// tests/tools/search-objects.ts

export const testCase5 = {
  name: 'search_objects - Filter by Email Domain',
  description: 'Should filter contacts by email domain',
  toolName: 'search_objects',

  input: {
    queries: [{
      objectType: 'native_contact',
      where: {
        email: { contains: '@company.com' }
      }
    }]
  },

  async validate(result: any) {
    // Parse response
    const parsed = JSON.parse(result.data.content[0].text);
    const contacts = parsed.native_contact.results;

    // Validate all emails contain the domain
    contacts.forEach((contact: any) => {
      if (contact.email && !contact.email.includes('@company.com')) {
        throw new Error(`Email ${contact.email} doesn't match filter`);
      }
    });

    return true;
  }
};
```

### Option 2: Create New Tool File

Create a new file for a tool that doesn't have tests yet:

```typescript
// tests/tools/create-person.ts

function parseResults(result: any) {
  if (!result.success) {
    throw new Error(`Call failed: ${result.error}`);
  }

  if (result.data?.isError) {
    throw new Error(`Tool error: ${result.data.content[0]?.text}`);
  }

  return JSON.parse(result.data.content[0].text);
}

export const testCase1 = {
  name: 'create_person - Create Contact',
  description: 'Should create a new contact',
  toolName: 'create_or_update_person_organization',

  input: {
    type: 'person',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  },

  async validate(result: any) {
    const response = parseResults(result);

    // Validate response has objectId
    if (!response.objectId) {
      throw new Error('Response missing objectId');
    }

    return true;
  }
};

export const testCase = testCase1; // Default export
```

## Test Case Format

Every test case must have:

```typescript
export const testCase1 = {
  // Human-readable name (shows in output)
  name: 'tool_name - What this tests',

  // Longer description
  description: 'Should do X when Y happens',

  // Tool name (must match MCP tool name exactly)
  toolName: 'search_objects',

  // Input to send to the tool
  input: {
    // Tool-specific parameters
  },

  // Validation function - throws on failure, returns true on success
  async validate(result: any) {
    // result.success - whether call succeeded
    // result.data.content[0].text - the actual response (usually JSON)
    // result.error - error message if failed

    if (!result.success) {
      throw new Error('Test failed');
    }

    return true;
  }
};
```

## Response Structure

MCP tools return responses in this format:

```typescript
{
  success: boolean,
  data: {
    content: [{
      type: "text",
      text: "JSON string with actual response"
    }],
    isError: boolean
  },
  error?: string
}
```

**Important**: The actual data is in `result.data.content[0].text` as a **JSON string** that needs to be parsed!

## Common Patterns

### Parse Search Results

```typescript
const parsed = JSON.parse(result.data.content[0].text);
const contacts = parsed.native_contact.results; // Array of contacts
```

### Parse Schema Results

```typescript
const schema = JSON.parse(result.data.content[0].text);
// schema.objectType - the object type
// schema.schema - markdown table string
```

### Handle Optional Results

```typescript
async validate(result: any) {
  // Some tests might not find data - that's okay
  if (result.data?.isError) {
    const errorText = result.data.content[0]?.text;
    if (errorText?.includes('not found')) {
      console.warn('⚠️  Note: No data found (expected)');
      return true;
    }
  }

  // Otherwise validate normally
  return true;
}
```

## CI/CD Integration

Add to your GitHub Actions:

```yaml
- name: Run MCP Tool Tests
  env:
    CLIENT_ID: ${{ secrets.DAY_AI_CLIENT_ID }}
    CLIENT_SECRET: ${{ secrets.DAY_AI_CLIENT_SECRET }}
    REFRESH_TOKEN: ${{ secrets.DAY_AI_REFRESH_TOKEN }}
  run: |
    cd day-ai-sdk
    yarn install
    yarn test
```

## Best Practices

1. **One file per tool** - Keep related tests together
2. **Multiple test cases** - Test different scenarios
3. **Clear names** - Make it obvious what each test does
4. **Lenient validation** - Tests run against real data which may vary
5. **Helper functions** - Share parsing logic across test cases
6. **Meaningful errors** - Throw errors that explain what went wrong

## Example Test Run

```bash
$ yarn test

🔧 Initializing Day AI SDK...
✅ Connected
   Workspace: Day AI
✅ MCP initialized

📋 Found 3 test files

Running: get_context_for_objects - Basic Test... ✅ (439ms)
Running: read_crm_schema - Contact Schema... ✅ (233ms)
Running: read_crm_schema - Organization Schema... ✅ (226ms)
Running: search_objects - Search Contacts... ✅ (3337ms)
Running: search_objects - Search Organizations... ✅ (2862ms)
Running: search_objects - Pagination Info... ✅ (3317ms)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Test Summary

  ✅ Passed: 11
  📦 Total:  11
  ⏱️  Time:   18558ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Troubleshooting

### "SAFETY CHECK FAILED: Tests can only run against localhost"
- Tests are blocked from running against production for safety
- Update `.env`: `DAY_AI_BASE_URL=http://localhost:8910`
- Make sure your local Day AI server is running

### "Connection failed"
- Check your `.env` file has `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`
- Run `yarn oauth:setup` if credentials are missing
- Ensure local server is running at `http://localhost:8910`

### "Tool not found"
- Verify `toolName` matches exactly (case-sensitive)
- Run `yarn example:mcp` to see available tools

### "Expected X but got Y"
- Check actual response format with `console.log(JSON.stringify(result, null, 2))`
- Response structures may vary based on your workspace data
- Update validation logic to match actual format

## Adding More Tools

To add tests for a new tool:

1. Create `tests/tools/your-tool-name.ts`
2. Export `testCase1`, `testCase2`, etc.
3. Run `yarn test` to verify
4. Tests will be automatically discovered and run!
