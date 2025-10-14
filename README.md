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
# Optional: Customize the OAuth callback URL (if you need a different host/port)
# CALLBACK_URL=http://localhost:3000/callback
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
yarn example:mcp
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

| Variable           | Description                  | Default                          |
| ------------------ | ---------------------------- | -------------------------------- |
| `INTEGRATION_NAME` | Name of your integration     | Required                         |
| `DAY_AI_BASE_URL`  | Day AI instance URL          | `https://day.ai`                 |
| `CALLBACK_URL`     | OAuth callback URL           | `http://127.0.0.1:8080/callback` |
| `CLIENT_ID`        | OAuth client ID              | Auto-populated                   |
| `CLIENT_SECRET`    | OAuth client secret          | Auto-populated                   |
| `REFRESH_TOKEN`    | OAuth refresh token          | Auto-populated                   |
| `WORKSPACE_ID`     | Target workspace ID          | Optional                         |

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

| Script                  | Description                            |
| ----------------------- | -------------------------------------- |
| `yarn build`            | Build TypeScript to JavaScript         |
| `yarn dev`              | Watch mode for development             |
| `yarn oauth:setup`      | Run OAuth setup wizard                 |
| `yarn example:mcp`      | Run MCP tool call example              |
| `yarn example:meetings` | Run meeting recordings context example |

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
```

### MCP (Model Context Protocol) Integration

The SDK includes built-in support for Day AI's MCP server:

```typescript
// Initialize MCP connection
await client.mcpInitialize();

// List available tools
const tools = await client.mcpListTools();
console.log("Available tools:", tools.data?.tools);

// Call a specific tool
const context = await client.mcpCallTool("get_context_for_objects", {
  objects: [
    {
      objectId: "email@company.com",
      objectType: "native_contact",
    },
  ],
});

// Search for objects with time-based filters
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const meetings = await client.mcpCallTool("search_objects", {
  queries: [
    {
      objectType: "native_meetingrecording",
    },
  ],
  timeframeStart: sevenDaysAgo.toISOString(),
  timeframeEnd: new Date().toISOString(),
  limit: 10,
});

// Get meeting recording context
const meetingContext = await client.mcpCallTool(
  "get_meeting_recording_context",
  {
    recordingId: "recording-id",
  }
);
```

### Example Scripts

Run these examples to see the SDK in action:

- **MCP Tools**: `yarn example:mcp` - List tools and get contact context
- **Recent Meetings**: `yarn example:meetings` - Search recent recordings and get context

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

# Object Schemas

For full object schema information, visit [SCHEMA.md](SCHEMA.md)

# Assistant Tool Input Schemas

This document describes the input schema for each tool available in the Day AI Assistant V1 API. Each tool has a specific purpose and requires certain input parameters to function correctly.

## Table of Contents

### Search & Query Tools

- [search_objects](#search_objects)
- [keyword_search](#keyword_search)
- [get_context_for_objects](#get_context_for_objects)

### CRM Object Management

- [create_or_update_person_organization](#create_or_update_person_organization)
- [create_or_update_opportunity](#create_or_update_opportunity)
- [create_or_update_pipeline_stage](#create_or_update_pipeline_stage)
- [update_object](#update_object)
- [analyze_before_create_or_update](#analyze_before_create_or_update)

### Content Creation & Management

- [create_page](#create_page)
- [update_page](#update_page)
- [create_email_draft](#create_email_draft)
- [send_email](#send_email)
- [create_or_update_workspace_context](#create_or_update_workspace_context)

### Actions & Tasks

- [create_or_update_action](#create_or_update_action)

### Views & Visualization

- [create_view](#create_view)
- [create_chart](#create_chart)

### Meeting & Recording Tools

- [get_meeting_recording_context](#get_meeting_recording_context)
- [create_meeting_recording_clip](#create_meeting_recording_clip)

### Notifications & Communication

- [send_notification](#send_notification)

### Utility Tools

- [web_search](#web_search)
- [get_share_url](#get_share_url)
- [create_custom_property](#create_custom_property)

---

## search_objects

Search for CRM objects using complex queries with filters and conditions.

### Input Schema

```typescript
{
  queries: Array<{
    objectType: string; // One of: Person, Organization, Opportunity, Action, MeetingRecording, Page, Thread, Draft, Pipeline, Stage
    where?: {
      AND?: Array<WhereCondition>;
      OR?: Array<WhereCondition>;
      NOT?: WhereCondition;
      // Direct property conditions
      [propertyName: string]: {
        equals?: any;
        not?: any;
        in?: any[];
        notIn?: any[];
        lt?: any;
        lte?: any;
        gt?: any;
        gte?: any;
        contains?: string;
        startsWith?: string;
        endsWith?: string;
        // Date-specific operators
        dateEquals?: string;
        dateLt?: string;
        dateLte?: string;
        dateGt?: string;
        dateGte?: string;
      };
    };
    orderBy?: Array<{
      [propertyName: string]: "asc" | "desc";
    }>;
    take?: number; // Limit results (default: 10, max: 100)
    skip?: number; // Offset for pagination
  }>;
}
```

### Example

```json
{
  "queries": [
    {
      "objectType": "Person",
      "where": {
        "AND": [
          { "email": { "contains": "@acme.com" } },
          { "jobTitle": { "contains": "Engineer" } }
        ]
      },
      "orderBy": [{ "lastName": "asc" }],
      "take": 20
    }
  ]
}
```

---

## keyword_search

Perform keyword-based searches across CRM objects.

### Input Schema

```typescript
{
  searchOperations: Array<{
    objectType:
      | "native_contact"
      | "native_organization"
      | "native_opportunity"
      | "native_pipeline"
      | "native_meetingrecording"
      | "native_page";
    keywords: string[]; // Keywords that should ALL be found. Use ["EMPTY"] to search all
    limit?: number; // 1-50, default: 10
    searchIntent?: "find_specific" | "explore_many"; // default: 'find_specific'
  }>;
}
```

### Example

```json
{
  "searchOperations": [
    {
      "objectType": "native_contact",
      "keywords": ["Jamie", "Alfalfa"],
      "limit": 3,
      "searchIntent": "find_specific"
    }
  ]
}
```

---

## get_context_for_objects

Retrieve detailed context for multiple CRM objects.

### Input Schema

```typescript
{
  objectIds: string[] // Array of object IDs to get context for
  tokenOffset?: number // For pagination, default: 0
}
```

### Example

```json
{
  "objectIds": ["person_123", "org_456", "opp_789"],
  "tokenOffset": 0
}
```

---

## create_or_update_person_organization

Create or update Person and Organization objects in the CRM.

### Input Schema

```typescript
{
  isCreating?: boolean // Explicitly control create vs update
  objectId?: string // Required for updates, empty for creates
  objectType: 'Person' | 'Organization'
  standardProperties?: {
    // Person properties
    email?: string
    firstName?: string
    lastName?: string
    phoneNumbers?: string[]
    jobTitle?: string
    linkedInUrl?: string
    xUrl?: string

    // Organization properties
    domain?: string
    name?: string
    url?: string
    industry?: string
    employeeCount?: number
    revenue?: number

    // Common properties
    [key: string]: any
  }
  customProperties?: Array<{
    propertyId: string // Custom property ID or "custom/{propId}/{optionId}" for picklists
    value: any // Value appropriate for the property type
  }>
}
```

### Example

```json
{
  "objectType": "Person",
  "standardProperties": {
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "jobTitle": "Software Engineer"
  },
  "customProperties": [
    {
      "propertyId": "custom_prop_123",
      "value": "Custom value"
    }
  ]
}
```

---

## create_or_update_opportunity

Create or update Opportunity objects.

### Input Schema

```typescript
{
  isCreating?: boolean // Explicitly control create vs update
  objectId?: string // Required for updates
  standardProperties?: {
    title: string // Required for creation
    stageId: string // Required for creation (UUID or full reference)
    domain: string // Required for creation (business domain, not freemail)
    ownerEmail?: string // Must be workspace member
    expectedRevenue?: number
    expectedCloseDate?: string // ISO date
    primaryPerson?: string
    type?: string
    roles?: Array<{
      personEmail: string
      roles: string[]
      reasoning?: string
    }>
    [key: string]: any
  }
  customProperties?: Array<{
    propertyId: string
    value: any
  }>
}
```

### Example

```json
{
  "standardProperties": {
    "title": "Acme Corp Enterprise Deal",
    "stageId": "abc123-def456",
    "domain": "acme.com",
    "ownerEmail": "sales@company.com",
    "expectedRevenue": 50000,
    "expectedCloseDate": "2024-06-30"
  }
}
```

---

## create_or_update_pipeline_stage

Create or update Pipeline and Stage objects.

### Input Schema

```typescript
{
  objectType: 'Pipeline' | 'Stage'
  objectId?: string // For updates
  propertyUpdates: Array<{
    propertyId: string
    value: any
    reasoning?: string
    source?: string
  }>
}
```

### Special Properties for Pipeline Creation

When creating a pipeline, include a `stages` property:

```typescript
{
  propertyId: "stages",
  value: Array<{
    title: string
    type: 'AWARENESS' | 'CONNECTION' | 'NEEDS_IDENTIFICATION' | 'EVALUATION' | 'CONSIDERATION_NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST'
    description?: string
    entranceCriteria: string[] // 2-4 observable criteria
  }>
}
```

### Example

```json
{
  "objectType": "Pipeline",
  "propertyUpdates": [
    {
      "propertyId": "title",
      "value": "Sales Pipeline"
    },
    {
      "propertyId": "type",
      "value": "NEW_CUSTOMER"
    },
    {
      "propertyId": "stages",
      "value": [
        {
          "title": "Demo Scheduled",
          "type": "CONNECTION",
          "entranceCriteria": ["Demo meeting booked on calendar"]
        },
        {
          "title": "Closed Won",
          "type": "CLOSED_WON",
          "entranceCriteria": ["Contract signed", "Payment received"]
        }
      ]
    }
  ]
}
```

---

## update_object

Update properties or add notes to existing CRM objects.

### Input Schema

```typescript
{
  objectId: string; // Required - must know the object ID
  objectType: NativeObjectType;
  updateDescription: string; // Description of the requested update
}
```

### Example

```json
{
  "objectId": "person_123",
  "objectType": "Person",
  "updateDescription": "Update job title to Senior Software Engineer and add note about promotion"
}
```

---

## analyze_before_create_or_update

Analyze available properties before creating or updating CRM objects.

### Input Schema

```typescript
{
  objectType: NativeObjectType
  objectId?: string // For updates
  contextString: string // Information about the object
}
```

### Example

```json
{
  "objectType": "Opportunity",
  "contextString": "Create opportunity for Acme Corp, owner: john@company.com, in awareness stage"
}
```

---

## create_page

Create a new page with formatted content.

### Input Schema

```typescript
{
  title: string
  pageHtmlContent: string // HTML content following specific formatting rules
  publishedForUserAt?: string // ISO datetime for sharing, null for private
  isTemplate?: boolean // Whether this is a template
}
```

### HTML Formatting Rules

- Tables: Use clean HTML without inline styles
- Structure: Use semantic HTML (h2, h3, p, ul, ol), never h1
- Objects: Reference with `<span data-object-id="id" data-object-type="type">Name</span>`
- Never use style attributes, class attributes, or markdown syntax

### Example

```json
{
  "title": "Meeting Notes - Acme Corp",
  "pageHtmlContent": "<h2>Overview</h2><p>Discussion about enterprise features.</p><h3>Action Items</h3><ul><li>Send proposal by Friday</li></ul>",
  "publishedForUserAt": "2024-01-15T10:00:00Z"
}
```

---

## update_page

Update an existing page's content or sharing status.

### Input Schema

```typescript
{
  pageId: string // Required - must be from previous create_page or search
  title?: string
  pageHtmlContent?: string // Same formatting rules as create_page
  publishedForUserAt?: string | null // Omit to keep current, null to make private
}
```

### Example

```json
{
  "pageId": "page_123",
  "title": "Updated Meeting Notes",
  "pageHtmlContent": "<h2>Updated Content</h2><p>New information added.</p>"
}
```

---

## create_email_draft

Create an email draft for later sending.

### Input Schema

```typescript
{
  to: string[] // Required - recipient email addresses
  cc?: string[]
  bcc?: string[]
  subject: string // Required
  htmlBody: string // Required - HTML formatted email body
  inReplyTo?: string // Thread ID for replies
}
```

### Example

```json
{
  "to": ["john@example.com", "jane@example.com"],
  "subject": "Project Update",
  "htmlBody": "<p>Hi team,</p><p>Here's the latest update on our project...</p>"
}
```

---

## send_email

Send a previously created email draft.

### Input Schema

```typescript
{
  draftId: string; // ID from create_email_draft
}
```

### Example

```json
{
  "draftId": "draft_123"
}
```

---

## create_or_update_workspace_context

Create or update context notes for CRM objects or properties.

### Input Schema

```typescript
{
  mode: 'create' | 'update'

  // For updates
  contextId?: string // Required for update mode

  // Main content
  plainTextValue: string // Markdown format content

  // For creates only
  title?: string // Page title (create only)
  summary?: string // Brief summary (create only)
  attachmentType?: 'object' | 'property' // Required for create
  objectType?: NativeObjectType // Required for create
  objectId?: string // Required for create
  propertyId?: string // Required if attachmentType is 'property'
}
```

### Example

```json
{
  "mode": "create",
  "plainTextValue": "## Important Context\n\nThis customer prefers morning meetings.",
  "title": "Customer Preferences",
  "attachmentType": "object",
  "objectType": "Organization",
  "objectId": "org_123"
}
```

---

## create_or_update_action

Create or update action items (tasks).

### Input Schema

```typescript
{
  actionId?: string // For updates
  title?: string // Required for creates, format: "[Person] needs [action]"
  assignedToAssistant: boolean // Required for creates
  executeAt?: string // ISO datetime for execution
  ownerEmail?: string // Required when assignedToAssistant is false
  description?: string
  descriptionPoints?: string[] // Preferred over description
  dueDate?: string // ISO datetime
  type?: 'FOLLOW_UP' | 'SUPPORT'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  status?: 'UNREAD' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED'
  people?: string[] // Email addresses
  domains?: string[] // Organization domains
  opportunityIds?: string[] // Related opportunity IDs
  actionUserInputDetails?: string
}
```

### Example

```json
{
  "title": "Sarah needs contract clarification",
  "assignedToAssistant": false,
  "ownerEmail": "sarah@company.com",
  "descriptionPoints": [
    "Sarah needs: contract terms clarification",
    "How: email response",
    "From: legal team on Mon 1/15",
    "Why: deal closing this week"
  ],
  "dueDate": "2024-01-20T17:00:00Z",
  "priority": "HIGH",
  "people": ["client@example.com"],
  "opportunityIds": ["opp_123"]
}
```

---

## create_view

Create custom views for CRM data with filters and sorting.

### Input Schema

```typescript
{
  objectType: 'Person' | 'Organization' | 'Opportunity'
  title: string
  description: string
  columns?: Array<{
    field: string // Property ID
    headerName?: string
    width?: number
    visible?: boolean // default: true
  }>
  filters?: Array<{
    field: string
    operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty' | '>' | '<' | '>=' | '<=' | '!=' | 'is' | 'not' | 'after' | 'before' | 'onOrAfter' | 'onOrBefore'
    value?: any
  }>
  sorting?: Array<{
    field: string
    sort: 'asc' | 'desc'
  }>
  groupBy?: string[] // Property IDs to group by
}
```

### Example

```json
{
  "objectType": "Opportunity",
  "title": "High-Value Pipeline",
  "description": "Opportunities over $50k",
  "columns": [
    { "field": "title", "width": 200 },
    { "field": "expectedRevenue", "width": 150 },
    { "field": "stage", "width": 150 }
  ],
  "filters": [{ "field": "expectedRevenue", "operator": ">=", "value": 50000 }],
  "sorting": [{ "field": "expectedRevenue", "sort": "desc" }]
}
```

---

## create_chart

Create data visualization charts.

### Input Schema

```typescript
{
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area'
  title: string
  description?: string
  data: {
    series: Array<{
      data: number[] // Numeric values
      label: string // Series name
      id?: string
      stack?: string // For stacked charts
      color?: string // Hex, rgb, named, or semantic color
    }>
    xAxis?: {
      data?: string[] // Category labels
      label?: string
      scaleType?: 'band' | 'linear' | 'log' | 'point' | 'pow' | 'sqrt' | 'time'
      min?: number
      max?: number
    }
    yAxis?: {
      label?: string
      scaleType?: 'band' | 'linear' | 'log' | 'point' | 'pow' | 'sqrt' | 'time'
      min?: number
      max?: number
    }
  }
  config?: {
    width?: number // default: 600
    height?: number // default: 400
    colors?: string[] // Color palette
    colorScheme?: 'default' | 'monochrome' | 'complementary' | 'analogous' | 'triadic' | 'warm' | 'cool' | 'pastel' | 'vibrant'
    showLegend?: boolean // default: true
    stacked?: boolean
    showGrid?: boolean // default: true
    margin?: {
      top?: number
      right?: number
      bottom?: number
      left?: number
    }
  }
}
```

### Example

```json
{
  "chartType": "bar",
  "title": "Quarterly Sales",
  "data": {
    "series": [
      {
        "data": [45000, 52000, 48000, 61000],
        "label": "Revenue"
      }
    ],
    "xAxis": {
      "data": ["Q1", "Q2", "Q3", "Q4"],
      "label": "Quarter"
    },
    "yAxis": {
      "label": "Revenue ($)"
    }
  },
  "config": {
    "colorScheme": "default"
  }
}
```

---

## get_meeting_recording_context

Get context from meeting recordings including transcript and summary.

### Input Schema

```typescript
{
  meetingRecordingId: string
  tokenOffset?: number // For pagination, default: 0
}
```

### Example

```json
{
  "meetingRecordingId": "meeting_123",
  "tokenOffset": 0
}
```

---

## create_meeting_recording_clip

Create a clip from a meeting recording.

### Input Schema

```typescript
{
  meetingRecordingId: string
  startSeconds: number
  endSeconds: number
  title: string
  description?: string
}
```

### Example

```json
{
  "meetingRecordingId": "meeting_123",
  "startSeconds": 300,
  "endSeconds": 360,
  "title": "Action Item: Update pricing model",
  "description": "John commits to updating the pricing model"
}
```

---

## send_notification

Send notifications via email or Slack.

### Input Schema

```typescript
{
  channel: 'email' | 'slack' | 'both'
  emailSubject?: string // Required for email
  emailBody?: string // Required for email, HTML format
  slackParagraphs?: string[] // Required for Slack, plain text
  reasoning: string // Why sending this notification
  sendAt?: string // ISO datetime for scheduling
}
```

### Example

```json
{
  "channel": "both",
  "emailSubject": "Important Update",
  "emailBody": "<p>Hi,</p><p>Here's an important update about the project...</p>",
  "slackParagraphs": [
    "Important project update:",
    "The deadline has been moved to next Friday."
  ],
  "reasoning": "User requested notification about deadline change"
}
```

---

## web_search

Search the web for information.

### Input Schema

```typescript
{
  userAnswer: string; // Search query
  otherImportantDetails: string; // Additional context
  howDeep: string; // 'VERY_DEEP' | 'MEDIUM' | 'BASIC'
}
```

### Example

```json
{
  "userAnswer": "latest AI trends in CRM",
  "otherImportantDetails": "Focus on enterprise solutions and integration capabilities",
  "howDeep": "MEDIUM"
}
```

---

## get_share_url

Get a shareable URL for a CRM object.

### Input Schema

```typescript
{
  objectId: string;
  objectType: "native_meetingrecording" |
    "native_meetingrecordingclip" |
    "native_pipeline" |
    "native_view" |
    "native_page" |
    "native_thread" |
    "native_action";
}
```

### Example

```json
{
  "objectId": "page_123",
  "objectType": "native_page"
}
```

---

## create_custom_property

Create custom properties for organizations or opportunities.

### Input Schema

```typescript
{
  objectTypeId: 'native_opportunity' | 'native_organization'
  propertyTypeId: PropertyType // textarea, integer, float, currency, percent, datetime, url, email, phone, boolean, picklist, multipicklist, etc.
  name: string
  description: string
  aiManaged: boolean // Whether AI can populate
  useWeb: boolean // MUST be false for opportunities
  options?: Array<{ // Required for picklist/multipicklist
    name: string
    description: string
  }>
}
```

### Example

```json
{
  "objectTypeId": "native_organization",
  "propertyTypeId": "picklist",
  "name": "Industry Vertical",
  "description": "The primary industry vertical for this organization",
  "aiManaged": true,
  "useWeb": true,
  "options": [
    {
      "name": "Technology",
      "description": "Software, hardware, and IT services"
    },
    {
      "name": "Healthcare",
      "description": "Medical, pharmaceutical, and health services"
    }
  ]
}
```

---

## Notes on Common Patterns

### Object References

Many tools use object references in the format: `workspaceId : objectType : objectId` (with spaces around colons).

### Date Formats

All dates should be in ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`

### Email Validation

Email addresses in owner fields must belong to workspace members.

### Property IDs for Custom Properties

- For picklists: Use `custom/{propertyId}/{optionId}`
- For multipicklists: Create separate updates for each selected option

### Token Limits

Some tools (like get_context_for_objects) return paginated results. Use the tokenOffset parameter to retrieve additional content.

### HTML Content Rules

When providing HTML content:

- No inline styles or style attributes
- Use semantic HTML tags
- Tables should be clean without styling
- Reference CRM objects with data attributes

## License

MIT License - see LICENSE file for details.
