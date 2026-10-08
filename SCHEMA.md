# Day AI Data Model & Search Reference

How Day AI's CRM data is shaped, and how to query it with `search_objects`.

- For the **tool list and every tool's input schema**, see [TOOLS.md](TOOLS.md) (generated from the live server).
- For the **exact properties in your workspace** (including custom properties and picklist option IDs), call `read_crm_schema`. It is always more current than this page.

> **Golden rules**
> 1. **objectIds are opaque.** Contacts and organizations are keyed by UUID, not by email or domain. Never build an objectId yourself — use one a tool returned.
> 2. **Look before you filter.** Call `read_crm_schema` for an object type before your first non-trivial query on it.
> 3. **Find by property, then by relationship.** To filter by a person or company you only know by email or domain, first search for it by its `email` / `domain` property, then use the returned `objectId` in a relationship filter.

---

## Contents

- [Object types](#object-types)
- [objectIds](#objectids)
- [search_objects](#search_objects)
  - [Request shape](#request-shape)
  - [Where clauses & operators](#where-clauses--operators)
  - [Time ranges](#time-ranges)
  - [Full-text (content) search](#full-text-content-search)
  - [Pagination & response shape](#pagination--response-shape)
- [Relationships](#relationships)
- [Object reference](#object-reference)
- [Custom properties](#custom-properties)
- [Recipes](#recipes)
- [Migrating from older SDK docs](#migrating-from-older-sdk-docs)

---

## Object types

These are the types `search_objects` accepts. Every type can also be described with `read_crm_schema`.

| objectType | What it is | Notes |
|---|---|---|
| `native_contact` | People | No `name` property — use `firstName` / `lastName` with `contains` |
| `native_organization` | Companies | `name` is contains-only; `domain` is exact |
| `native_opportunity` | Deals | Filter by company with the `subject` relationship |
| `native_pipeline` | Sales / partner / fundraising pipelines | |
| `native_stage` | Pipeline stages | Opportunities reference stages via `stageId` |
| `native_meetingrecording` | Recorded meetings | Transcripts only when `status/latest/code` is `READY` |
| `native_meetingrecordingclip` | Clips cut from recordings | Fetch by `objectIds` |
| `native_calendarevent` | Calendar events | Relationship targets are **emails / domains** |
| `native_emailmessage` | Email messages | Relationship targets are **emails / domains**; replaces `native_gmailthread` |
| `native_action` | Tasks and follow-ups | |
| `native_page` | Documents and notes | Bodies aren't indexed — read with `read_page` |
| `native_context` | Notes attached to records | Usually easier to read inline from the parent (see [Recipes](#read-notes-on-a-record)) |
| `native_draft` | Email / Slack drafts | |
| `native_campaign` | Outreach campaigns | Members are `member` / `memberOf` edges to contacts |
| `native_campaignmemberstatus` | Custom campaign member statuses | |
| `native_template` | Email, page and knowledge templates | |
| `native_thread` | Day AI chat threads | Content search returns at most 5 threads |
| `native_slackchannel` | Slack channels (with summaries) | |
| `native_slackmessage` | Slack messages | 60-day default lookback |
| `native_list` | Temporary agent work queues | |
| `native_file` | Uploaded files | Read contents with `read_file` / `read_csv_file` |
| `native_folder` | Folders | No relationship filters |
| `native_view` | Saved table views | Always filter on `objectType` |
| `native_user` | Workspace members | No `email` property in search |
| `native_assistant` | Day AI assistants (agents) | |
| `native_instruction` | Workspace / skill instructions | |
| `native_webpage` | Web pages Day AI has read | |
| `native_workspace` | The workspace | Fetch by `objectIds` |

**Not searchable** (but `read_crm_schema` will describe them): comment threads/messages, skills, skillsets, tags, imports, territories, prospecting candidates.

**Deprecated:** `native_gmailthread` and `native_gmailmessage` are still accepted for backwards compatibility but are no longer advertised. Use `native_emailmessage`.

There are no user-defined object types. Customization happens through [custom properties](#custom-properties).

---

## objectIds

| Type | objectId | How to find it |
|---|---|---|
| `native_contact` | UUID | `search_objects` on `email` (exact) or `firstName`/`lastName` (contains) |
| `native_organization` | UUID | `search_objects` on `domain` (exact) or `name` (contains) |
| `native_user`, `native_assistant` | UUID | `whoami` for yourself; `search_objects` otherwise |
| Everything else | Opaque ID (usually UUID) | Whatever a tool returned |

References inside properties (`stageId`, `organizationId`, `pipelineId`) are objectIds too.

**The one exception is relationship targets on email and calendar types.** `native_emailmessage` and `native_calendarevent` store their participants as email addresses and domains, so relationship filters on those types take an email or domain as `targetObjectId`. See [Relationships](#relationships).

> Always resolve the objectId yourself first. That's the supported pattern, and it works the same way regardless of how many records share an email or domain.

---

## search_objects

### Request shape

```jsonc
{
  "queries": [                          // required — one entry per object type
    {
      "objectType": "native_opportunity",
      "objectIds": ["…"],               // optional — fetch specific records
      "where": { /* condition */ }      // optional
    }
  ],
  // Everything below is top-level and applies to every query in the call:
  "propertiesToReturn": ["title", "stageId", "ownerEmail"],  // omit = defaults, "*" = all
  "includeRelationships": true,         // default false
  "timeframeStart": "2026-09-01",       // YYYY-MM-DD or ISO instant with offset
  "timeframeEnd":   "2026-09-30",
  "timeframeField": "updatedAt",
  "offset": 0,
  "paginationMode": "offset",           // or "cursor"
  "cursor": null,                       // { objectType, afterId } from nextCursor
  "cursorPageSize": 200                 // 1–1000, cursor mode only
}
```

A query entry holds **only** `objectType`, `objectIds` and `where`. Put `propertiesToReturn`, `includeRelationships`, timeframe and pagination parameters at the top level.

- `propertiesToReturn`: by default you get `objectId`, title/name, `updatedAt` and a short description. Use `"*"` sparingly — ask for the specific properties you need on bulk reads.
- `includeRelationships`: returns connected objects. It's populated for pages of 50 rows or fewer; larger pages return a `_relationshipCount` summary.

### Where clauses & operators

A `where` is one condition, an `AND` of conditions (which may contain one level of `OR`), or an `OR` of conditions:

```jsonc
// Property condition
{ "propertyId": "email", "operator": "eq", "value": "jane@acme.com" }

// Relationship condition (never mix with propertyId)
{ "relationship": "subject", "targetObjectType": "native_organization",
  "targetObjectId": "6f1c…", "operator": "eq" }

// Combined
{ "AND": [
    { "propertyId": "status", "operator": "neq", "value": "COMPLETED" },
    { "OR": [
        { "propertyId": "priority", "operator": "eq", "value": "HIGH" },
        { "propertyId": "type", "operator": "eq", "value": "FOLLOWUP" }
    ] }
] }
```

For anything deeper (an OR of ANDs), send several entries in `queries`.

**Operators:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `notContains`, `startsWith`, `endsWith`, `is`, `isAnyOf`, `containsAnyOf`, `containsAllOf`, `isNull`, `isNotNull`. Common synonyms (`equals`, `onOrAfter`, `anyOf`, …) are corrected automatically.

| Property kind | Operators |
|---|---|
| Free text (names, titles, descriptions) | **`contains` only** — `eq` / `neq` / `isNull` always fail |
| Email, phone, exact-match IDs | `eq`, `neq`, `contains`, `startsWith`, `endsWith`, `isNull` |
| Number, currency, date, datetime | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `isNull` |
| Boolean | `is` / `eq` with `"true"` or `"false"` |
| Picklist | `eq`, `neq`, `isAnyOf` (values are option IDs for custom picklists) |
| Multi-select picklist | `containsAnyOf`, `containsAllOf` |

`read_crm_schema` lists exactly which operators each property supports. Common gotchas:

- Contact `firstName` / `lastName`, organization `name` and opportunity `domain` are **contains-only**.
- `date` properties (e.g. opportunity `timeframeEnd`) are calendar days: `eq "2026-07-31"` matches the whole UTC day.
- Array-valued operators (`isAnyOf`, `containsAnyOf`, `containsAllOf`) take a string array as `value`.

### Time ranges

`timeframeStart` / `timeframeEnd` accept a bare `YYYY-MM-DD` (a whole UTC day; the end is inclusive) or an ISO-8601 instant with an offset.

| `timeframeField` | Meaning |
|---|---|
| `updatedAt` | Last changed (default for most types) |
| `createdAt` | Created |
| `storedAt` | When the record was stored (meeting recordings) |
| `time` | Sent time — **`native_emailmessage` only**, and its default |
| `writtenAt` | Search-index write time — **for incremental sync only**, not "recently changed" |

Some types always use their own clock: meeting recordings filter on stored time and calendar events on start time, whatever you pass.

There is no sort parameter. Results come back newest-updated first; calendar events by start time, emails by sent time, and content searches by relevance.

### Full-text (content) search

Filter on the virtual `content` property with `contains` to run a relevance-ranked keyword search with excerpts:

| Type | Searches | Max results |
|---|---|---|
| `native_meetingrecording` | Title, summary, notes, transcript | 50 |
| `native_emailmessage` | Subject, snippet, body | 15 |
| `native_page` | Titles only (bodies aren't indexed) | — |
| `native_thread` | Message text | 5 threads × 3 excerpts |

Put all your keywords in **one** `content` condition. A `content` condition inside an `OR` falls back to a plain filter, and cursor pagination isn't supported for content searches.

### Pagination & response shape

Responses are sized to fit a token budget (about 20,000 tokens over MCP), so page size shrinks automatically when you ask for many properties.

```jsonc
{
  "status": "partial",            // or "complete"
  "returnedCount": 25,
  "totalRecords": 312,
  "totalRecordsIsLowerBound": false,
  "hasMore": true,
  "nextOffset": 25,               // pass back as top-level "offset"
  "paginationNote": "…",
  "native_opportunity": {
    "totalCount": 312,
    "results": [
      { "objectType": "native_opportunity", "objectId": "…", "title": "…",
        "description": "…", "properties": { … }, "relationships": [ … ] }
    ]
  },
  "todayNote": "…"
}
```

Repeat the same request with `offset = nextOffset` until `status` is `complete`. For scans past 10,000 matches, use `paginationMode: "cursor"` and pass back `nextCursor`. The SDK's [pagination example](examples/pagination-example.ts) walks through offset pagination.

Responses can also carry notes worth surfacing to a model — `visibilityNotes`, `recordingStatus` on meetings, resolved-target notes, and so on.

---

## Relationships

A relationship condition is `{ relationship, targetObjectType, targetObjectId, operator }`, where `operator` is `eq` (match) or `neq` (exclude). Relationship names are **directional**: use the names listed under the type you're searching.

| When searching… | relationship → targetObjectType |
|---|---|
| `native_contact` | `organization` → organization · `memberOf` → campaign · `attended` → meetingrecording · `related` → opportunity, action, page, context · `context` → context |
| `native_organization` | `member` → contact · `opportunity` → opportunity (org is the subject) · `related` → opportunity (other roles), action, page · `attended` → meetingrecording · `context` → context |
| `native_opportunity` | `subject` → organization (**the company filter**) · `related` → organization, contact, meetingrecording, page, action · `stage` → stage · `assignee` → user · `context` → context |
| `native_pipeline` | `stage` → stage · `context` → context |
| `native_stage` | `pipeline` → pipeline · `opportunity` → opportunity · `context` → context |
| `native_meetingrecording` | `attendee` → contact, organization · `related` → opportunity · `context` → context |
| `native_calendarevent` | `attendee` → contact (**email**), organization (**domain**) |
| `native_emailmessage` | `fromRecipient` / `toRecipient` / `ccRecipient` / `bccRecipient` → contact (**email**) · `recipient` → organization (**domain**) |
| `native_action` | `related` → contact, opportunity, organization · `assignee` → user, assistant |
| `native_draft` | `hasRecipient` → contact · `creator` → user (yourself only) · `parent` → campaign |
| `native_campaign` | `generated` → draft · `creator` → user |
| `native_context` | `parent` → contact, organization, opportunity, meetingrecording, action · `creator` → user |
| `native_page` | `related` → organization, contact, opportunity · `parent` → context, instruction |
| `native_instruction` | `content` → page · `creator` → user |
| `native_user` | `assigned` → opportunity, action · `authored` → context, instruction |
| `native_assistant` | `assigned` → action · `authored` → context |

Contacts and organizations also have `canonical` / `alias` edges between merged duplicates.

**`targetObjectId` rules**

- Normally it's the **objectId** of the target, from a previous search.
- On `native_emailmessage` and `native_calendarevent` it's the target's **full email address** (contacts) or **exact domain** (organizations).
- `native_user` targets are always user UUIDs — never emails.

Thread, Slack, template, list, file, folder and view types have no searchable relationships. Use their properties instead (e.g. thread `objectReferences contains <objectId>`, Slack `channelId` / `authorEmail`).

With `includeRelationships: true` on a campaign search, member edges include properties such as `status`, `addedAt`, `sequenceState` and `sequenceNextTouchDueAt`.

---

## Object reference

The key properties for each common type. **W** = writable through tools, **R** = read-only (searchable but set by Day AI). This is a summary: `read_crm_schema` is the complete, current list for your workspace.

### native_contact

| Property | Type | | Notes |
|---|---|---|---|
| `email` | email | W | Primary email. Optional. **Not** the objectId |
| `firstName`, `lastName` | text | W | Contains-only |
| `currentJobTitle`, `currentCompanyName` | text | W | |
| `currentJobStartDate` | date | W | `YYYY-MM-DD` |
| `linkedInUrl` | url | W | |
| `primaryPhoneNumber`, `phoneNumbers` | phone | W | |
| `location`, `city`, `state`, `country`, `postalCode`, `timezone` | text | W | |
| `headline`, `description`, `careerSummary`, `industry` | text | W | |
| `workExperience` | list | W | `{ companyName, title, startDate, endDate, description }`, all optional |
| `education` | list | W | `{ schoolName, fieldOfStudy, degree, startDate, endDate }`, all optional |
| `skills`, `languages`, `interests`, `certifications` | list | W | |
| `lastContactedAt` | datetime | W | |
| `do_not_sequence`, `email_verification_status` | various | R | Deliverability / suppression |

To find a contact's company, use the `organization` relationship.

### native_organization

| Property | Type | | Notes |
|---|---|---|---|
| `name` | text | W | Contains-only |
| `domain` | text | W | Exact match. Optional. **Not** the objectId |
| `description`, `aiDescription` | text | W | |
| `industry` | picklist | W | |
| `specialities`, `doesBusinessWith` | multi-picklist | W | |
| `employeeCount` | integer | W | Authoritative; `employeeCountFrom`/`To` are a vendor bracket |
| `annualRevenue`, `funding` | currency | W | |
| `founded` | integer | W | |
| `isHiring` | boolean | W | |
| `location`, `address`, `city`, `state`, `country`, `postalCode` | text | W | |
| `status/warmth` | integer 0–100 | W | |
| `status/highLevelSummary`, `status/currentStatusOneSentence`, `status/nextSteps` | text | W | |
| `lastContactedAt` | datetime | R | |
| `hasOpportunity`, `opportunityIds`, `news`, `keywords` | various | R | |

### native_opportunity

| Property | Type | | Notes |
|---|---|---|---|
| `title` | text | W | **Required** |
| `stageId` | reference | W | **Required.** objectId of a `native_stage` |
| `organizationId` | reference | W | objectId of the subject organization |
| `domain`, `organizationName` | text | W | Contains-only |
| `ownerEmail` | email | W | |
| `timeframeStart`, `timeframeEnd` | date | W | `YYYY-MM-DD` |
| `roles` | list | W | People and their roles on the deal |
| `type`, `position`, `stageReasoning`, `pipelineReasoning` | various | W | |
| `expectedRevenue` | currency | R | Rolled up |
| `expectedCloseDate` | date | R | |
| `pipelineId` | reference | R | Filter on stages, not pipelines |
| `ownerId`, `currentStatus`, `recommendedStage`, `lastContactedAt` | various | R | |

Deprecated and read-only: `amount`, `probability`, `currentSituation`, `goalsAndKPIs`, `challengesAndSolutions`, `primaryPerson`.

### native_pipeline

| Property | Type | | Notes |
|---|---|---|---|
| `title` | text | W | Required |
| `type` | enum | W | Required. `NEW_CUSTOMER`, `EXISTING_CUSTOMER`, `FINANCING_INVESTMENT`, `VENTURE_CAPITAL`, `PARTNER` |
| `hasRevenue` | boolean | W | Required |
| `icpOrganization`, `icpMetadata` | text | W | Required |
| `icpPeople`, `description` | text | W | |

### native_stage

| Property | Type | | Notes |
|---|---|---|---|
| `title` | text | W | Required |
| `type` | enum | W | Required. `AWARENESS`, `CONNECTION`, `NEEDS_IDENTIFICATION`, `PROPOSAL`, `EVALUATION`, `CONSIDERATION_NEGOTIATION`, `CLOSED_WON`, `CLOSED_LOST`, `CUSTOMER_SUCCESS` |
| `pipelineId` | reference | W | Required, immutable. Filter with `eq` (never `neq`) |
| `position` | integer | W | Required |
| `entranceCriteria` | text | W | Required |
| `likelihoodToClose` | percent | W | |
| `expectedRevenue` | currency | R | |

### native_meetingrecording

| Property | Type | | Notes |
|---|---|---|---|
| `title`, `description`, `topic` | text | W | |
| `descriptionBullets` | string list | W | |
| `notes` | long text | W | |
| `type` | picklist | W | AI-classified meeting type |
| `storedAt` | datetime | W | |
| `status/latest/code` | picklist | R | `READY` when the transcript is available |
| `platform`, `sharedWithWorkspace`, `descriptionLong` | various | R | |

Filter by participants with the `attendee` relationship only. To read a meeting's transcript and summary, call `get_meeting_recording_context`.

### native_calendarevent

`title`, `description`, `location`, `status`, `startsAt`, `endsAt`, `meetingJoinLink`, `organizerEmail`, `attendees` (`{ email, name, status, isOrganizer, objectId }`), `domains`. Filtering on `attendees contains <email>` and the `attendee` relationship give the same results.

### native_emailmessage

All read-only: `subject`, `snippet`, `time` (sent time), `body/text`, `body/html`, `labelIds`, `lastModifiedAt`. Use `timeframeField: "time"` (the default) and the `fromRecipient` / `toRecipient` / `ccRecipient` / `bccRecipient` / `recipient` relationships.

### native_action

| Property | Type | | Notes |
|---|---|---|---|
| `title` | text | W | |
| `status` | enum | W | Required. `UNREAD`, `READ`, `IN_PROGRESS`, `NEEDS_INPUT`, `SNOOZED`, `DISMISSED`, `REDUNDANT`, `COMPLETED` |
| `ownerEmail` | email | W | Required |
| `priority` | enum | W | `HIGH`, `MEDIUM`, `LOW` |
| `type` | enum | W | `SUPPORT`, `FOLLOWUP`, `MEETINGPREP`, `FEATURE_REQUEST`, `MEETING_RECORDING_FOLLOWUP`, `EMAIL_RESPONSE`, `SCHEDULE_MEETING`, `NUDGE`, `OTHER` |
| `timeframeEnd` | date | W | Due date |
| `timeframeStartAt`, `timeframeEndAt` | datetime | W | |
| `descriptionPoints`, `people`, `domains` | text | W | |
| `description`, `reasoning`, `sourceType`, `sourceLabel` | text | R | |

"My open tasks" = `ownerEmail isAnyOf [all my addresses]` AND `status` not in `COMPLETED`, `DISMISSED`, `REDUNDANT`.

### native_page

`title`, `templateType`, `ownerEmail` (R), `createdAt` (R), `lastUpdatedAt` (R), `publishedForUserAt`. Page bodies aren't in the search index — use `read_page` to read one.

### native_draft

All read-only: `email/subject`, `email/from`, `recipients`, `channel` (`EMAIL` / `SLACK`), `type`, `status`, `scheduledSendTime`, `whyNowEvidence`, `draftExplanation`, plus campaign-sequence and bounce fields. Ask for `propertiesToReturn: ["contentHtml", "email/subject", "email/from"]` to get the body.

### native_campaign

Key properties: `title` and `purpose` (required), `populationStatus`, `draftingStatus`, `archivedAt` (`isNull` = active), `sequencingEnabled`, `sendSchedule`, `dailySendLimit`. Use the `get_campaign_details` and `list_campaigns` tools for richer views.

### Other types

| Type | Key properties |
|---|---|
| `native_context` | `summary`. Read notes inline from the parent instead (see [Recipes](#read-notes-on-a-record)) |
| `native_template` | `type` (`EMAIL`, `INTERNAL_PAGE`, `KNOWLEDGE`), `description`, `descriptionShort`, `skillset`. Request `contentHtml` for the body |
| `native_thread` | `title`, `status`, `objectReferences` (filter with `contains <objectId>`) |
| `native_slackmessage` | `body`, `authorEmail`, `authorName`, `authorDomain`, `domains`, `channelName`, `channelId` |
| `native_slackchannel` | `channelName`, `domains`, `people`, `oneSentenceSummary`, `longSummary`, `summarizedThrough` |
| `native_campaignmemberstatus` | `label`, `position`, `color` |
| `native_list` | `title`, `type`, `workQueue` |
| `native_file` | `title` (filename), `extension` |
| `native_folder` | `title`, `color`, `emoji`; filter on `section` (`private` / `workspace`) or `parentFolderId` |
| `native_view` | `objectType` (always filter on it) |
| `native_user` | `status`, `activatedAt`, `deactivatedAt` |

---

## Custom properties

- Custom properties exist on organizations, opportunities and contacts (mainly).
- In tools, a custom property's `propertyId` is its **definition UUID**, which `read_crm_schema` lists.
- Picklist values are **option UUIDs**, not labels. `read_crm_schema` lists the options.
- Custom `date` properties take `YYYY-MM-DD`.
- Some custom properties are auto-populated by Day AI from workspace activity or web research. `read_crm_schema` groups them by population mode; leave ones with population turned off alone unless the user asks.
- Create and backfill them with `create_or_update_custom_property` and `backfill_custom_property`.

---

## Recipes

All recipes are `search_objects` calls. With the SDK, pass them to `client.mcpCallTool('search_objects', …)` or use `client.search(…)`.

### Find a contact by email, then their meetings

```jsonc
// 1. Resolve the contact
{ "queries": [{ "objectType": "native_contact",
    "where": { "propertyId": "email", "operator": "eq", "value": "jane@acme.com" } }] }

// 2. Use the returned objectId
{ "queries": [{ "objectType": "native_meetingrecording",
    "where": { "relationship": "attendee", "targetObjectType": "native_contact",
               "targetObjectId": "<contact objectId>", "operator": "eq" } }],
  "timeframeStart": "2026-07-01" }
```

### Open opportunities for a company

```jsonc
// 1. Resolve the organization
{ "queries": [{ "objectType": "native_organization",
    "where": { "propertyId": "domain", "operator": "eq", "value": "acme.com" } }] }

// 2. Filter opportunities by subject
{ "queries": [{ "objectType": "native_opportunity",
    "where": { "relationship": "subject", "targetObjectType": "native_organization",
               "targetObjectId": "<org objectId>", "operator": "eq" } }],
  "propertiesToReturn": ["title", "stageId", "ownerEmail", "expectedRevenue"] }
```

To narrow to open deals, look up the pipeline's stages (`native_stage` with `pipelineId eq …`) and filter `stageId isAnyOf [...]` on the non-closed ones.

### Emails with someone (no lookup needed)

```jsonc
{ "queries": [{ "objectType": "native_emailmessage",
    "where": { "relationship": "fromRecipient", "targetObjectType": "native_contact",
               "targetObjectId": "jane@acme.com", "operator": "eq" } }],
  "timeframeStart": "2026-09-01" }
```

### Meetings where pricing came up

```jsonc
{ "queries": [{ "objectType": "native_meetingrecording",
    "where": { "propertyId": "content", "operator": "contains", "value": "pricing discount renewal" } }],
  "timeframeStart": "2026-06-01" }
```

### Read notes on a record

Search the parent with `includeRelationships: true`. Notes come back inline as `noteTitle`, `noteText` and `noteWrittenAt`; when `truncated` is true, pass the note's `pageId` to `read_page` for the full text.

```jsonc
{ "queries": [{ "objectType": "native_organization", "objectIds": ["<org objectId>"] }],
  "includeRelationships": true }
```

### Incremental sync

Use `timeframeField: "writtenAt"` with `timeframeStart` set to when your previous sync started, and `paginationMode: "cursor"`. Record the start time of each run and use it as the next run's `timeframeStart`. Run one full backfill before your first incremental sync.

---

## Migrating from older SDK docs

| Old guidance | Current behavior |
|---|---|
| Contact objectId = email; organization objectId = domain | Both are UUIDs. Resolve by `email` / `domain` property first |
| `targetObjectId: "john@acme.com"` on meeting / opportunity searches | Use the contact or org objectId (emails/domains only on email and calendar types) |
| `native_gmailthread` for email | `native_emailmessage` |
| Opportunity company filter via `related` | `subject` |
| Organization → Opportunity via `involved in`; Organization → Context via `has note` | `opportunity` / `related`; `context` |
| Meeting `summaryShort`, `summaryLong`, `participants`, `domains`, `statusLabel` | Not exposed. Use `get_meeting_recording_context`, the `attendee` relationship and `status/latest/code` |
| Opportunity `amount`, `probability`, `expectedRevenue`, `expectedCloseDate` writable | Deprecated or read-only |
| `workExperience[].jobTitle` | `workExperience[].title` |
| `send_notification_mcp`, `analyze_pipeline_metrics`, `search_prospects` | Removed from MCP. See [TOOLS.md](TOOLS.md) |
