# Day AI SDK

A TypeScript/Node.js SDK for integrating with Day AI's platform. This SDK handles OAuth 2.0 authentication with automatic token refresh and provides a clean, authenticated interface for interacting with Day AI's APIs.

## Features

- 🔐 **OAuth 2.0 Integration**: Complete OAuth flow with dynamic client registration
- 🔄 **Automatic Token Refresh**: Tokens are refreshed automatically on every request
- 📝 **TypeScript Support**: Full type safety and IntelliSense support
- 🎯 **GraphQL Ready**: Built-in support for GraphQL queries
- ⚙️ **Environment Configuration**: Easy setup with `.env` files
- 🛡️ **Error Handling**: Comprehensive error handling and logging

## Quick Start

### 1. Installation

```bash
# Clone or download the SDK
cd day-ai-sdk
yarn install
yarn build
```

### 2. Configuration

Copy the environment template and configure your integration:

```bash
cp .env.example .env
```

Edit `.env` and set your integration name:

```env
INTEGRATION_NAME=My Custom Integration
DAY_AI_BASE_URL=https://day.ai
# OAuth credentials will be populated automatically
CLIENT_ID=
CLIENT_SECRET=
REFRESH_TOKEN=
```

### 3. OAuth Setup

Run the OAuth setup script to register your integration and get credentials:

```bash
yarn oauth:setup
```

This will:

1. Register a new OAuth client with Day AI
2. Open your browser for authorization
3. Exchange the authorization code for tokens
4. Update your `.env` file with the credentials

### 4. Test Your Integration

```bash
yarn example:basic
```

## Usage

### Basic Client Setup

```typescript
import { DayAIClient } from "day-ai-sdk";

// Initialize with automatic .env loading
const client = new DayAIClient();

// Or provide config explicitly
const client = new DayAIClient({
  baseUrl: "https://day.ai",
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  refreshToken: "your-refresh-token",
});
```

### Making API Requests

```typescript
// Test connection
const connectionTest = await client.testConnection();
if (!connectionTest.success) {
  throw new Error("Connection failed: " + connectionTest.error);
}

// Get workspace metadata
const metadata = await client.getWorkspaceMetadata();
console.log("Workspace:", metadata.data.workspaceName);

// Make a REST API call to any Day AI endpoint
const response = await client.request("/api/graphql", {
  method: "POST",
  body: JSON.stringify({
    query: "query { /* your GraphQL query here */ }",
    variables: {},
  }),
});

// Make a GraphQL query (wrapper for the above)
const graphqlResult = await client.graphql(`
  query YourQuery {
    # Use your actual Day AI GraphQL schema here
    # This SDK doesn't assume what endpoints are available
  }
`);
```

### Error Handling

All SDK methods return a standardized response format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const result = await client.request("/api/endpoint");
if (result.success) {
  console.log("Data:", result.data);
} else {
  console.error("Error:", result.error);
}
```

## OAuth Flow Details

The SDK implements OAuth 2.0 with the following flow:

1. **Dynamic Client Registration**: Automatically registers your integration
2. **Authorization**: Opens browser for user consent
3. **Token Exchange**: Exchanges authorization code for access/refresh tokens
4. **Automatic Refresh**: Refreshes access tokens before each API call

### Manual OAuth Setup

If you prefer to set up OAuth manually:

```typescript
import OAuthSetup from "day-ai-sdk/scripts/oauth-setup";

const setup = new OAuthSetup();
await setup.run();
```

## Configuration Options

### Environment Variables

| Variable           | Description              | Default          |
| ------------------ | ------------------------ | ---------------- |
| `INTEGRATION_NAME` | Name of your integration | Required         |
| `DAY_AI_BASE_URL`  | Day AI instance URL      | `https://day.ai` |
| `CLIENT_ID`        | OAuth client ID          | Auto-populated   |
| `CLIENT_SECRET`    | OAuth client secret      | Auto-populated   |
| `REFRESH_TOKEN`    | OAuth refresh token      | Auto-populated   |
| `WORKSPACE_ID`     | Target workspace ID      | Optional         |

### Client Configuration

```typescript
interface DayAIConfig {
  baseUrl?: string; // Day AI instance URL
  clientId: string; // OAuth client ID
  clientSecret: string; // OAuth client secret
  refreshToken: string; // OAuth refresh token
  workspaceId?: string; // Target workspace ID
}
```

## Available Scripts

| Script               | Description                    |
| -------------------- | ------------------------------ |
| `yarn build`         | Build TypeScript to JavaScript |
| `yarn dev`           | Watch mode for development     |
| `yarn oauth:setup`   | Run OAuth setup wizard         |
| `yarn example:basic` | Run basic example              |

## Examples

### Testing Your Connection

```typescript
import { DayAIClient } from "day-ai-sdk";

const client = new DayAIClient();

// Test basic connectivity and OAuth
const test = await client.testConnection();
if (test.success) {
  console.log("✅ Connected to Day AI");
  console.log("Workspace:", test.data.workspace.workspaceName);
} else {
  console.error("❌ Connection failed:", test.error);
}
```

### Using the API

```typescript
// The SDK provides authenticated access to Day AI's API
// You'll need to consult Day AI's API documentation for available endpoints

// Example: Make any authenticated request
const apiResponse = await client.request("/api/some-day-ai-endpoint", {
  method: "GET",
});

if (apiResponse.success) {
  console.log("API Response:", apiResponse.data);
} else {
  console.error("API Error:", apiResponse.error);
}

// Example: GraphQL query (use your actual schema)
const graphqlResponse = await client.graphql(`
  query {
    # Consult Day AI's GraphQL schema documentation
    # This SDK handles authentication but doesn't define the schema
  }
`);
```

## Token Management

The SDK automatically handles token refresh:

- Access tokens are cached and reused until near expiration
- Refresh happens automatically before each API call
- No manual token management required
- 60-second buffer before token expiry

## Error Handling

Common error scenarios:

```typescript
// Network/connection errors
const result = await client.request("/api/endpoint");
if (!result.success) {
  if (result.error.includes("ECONNREFUSED")) {
    console.error("Cannot connect to Day AI - check your baseUrl");
  }
}

// Authentication errors
const graphql = await client.graphql("query { ... }");
if (!graphql.success) {
  if (graphql.error.includes("401")) {
    console.error("Authentication failed - check your credentials");
  }
}
```

## Development

### Project Structure

```
day-ai-sdk/
├── src/
│   ├── client.ts          # Main SDK client
│   └── index.ts           # Public exports
├── scripts/
│   └── oauth-setup.ts     # OAuth setup wizard
├── examples/
│   └── basic-example.ts   # Usage examples
├── dist/                  # Compiled JavaScript
└── .env.example          # Environment template
```

### Building from Source

```bash
git clone <repository>
cd day-ai-sdk
yarn install
yarn build
```

## Troubleshooting

### OAuth Issues

**Problem**: "Please set INTEGRATION_NAME in your .env file"
**Solution**: Copy `.env.example` to `.env` and set `INTEGRATION_NAME`

**Problem**: "Failed to register client"
**Solution**: Check that `DAY_AI_BASE_URL` points to the correct Day AI instance

**Problem**: "Authorization timeout"
**Solution**: Complete the browser authorization within 5 minutes

### Connection Issues

**Problem**: "Cannot find name 'process'"
**Solution**: Run `yarn build` to compile TypeScript first

**Problem**: "Connection failed"
**Solution**: Verify your Day AI instance URL and network connectivity

## License

MIT License - see LICENSE file for details.
