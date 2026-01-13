# Zod Schemas by Object Type

## Organization

| Property Key                    | Day AIProperty Type | Zod Type                                                              | Description                                                                                                                           |
| ------------------------------- | ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| name                            | TextArea            | `z.string().optional()`                                               | The name of the organization                                                                                                          |
| description                     | TextArea            | `z.string().optional()`                                               | The description of the organization                                                                                                   |
| domain                          | TextArea            | `z.string().min(1)`                                                   | The domain of the organization. This is the objectId of the organization. This property is required when creating a new organization. |
| aiDescription                   | TextArea            | `z.string().optional()`                                               | The AI-generated description of the organization                                                                                      |
| founded                         | Integer             | `z.number().int().min(1800).max(new Date().getFullYear()).optional()` | Year founded                                                                                                                          |
| promises                        | TextArea            | `z.array(z.string()).optional()`                                      | The marketing promises of the organization                                                                                            |
| naicsCodes                      | TextArea            | `z.array(z.number()).optional()`                                      | The NAICS codes of the organization                                                                                                   |
| sicCodes                        | TextArea            | `z.array(z.number()).optional()`                                      | The SIC codes of the organization                                                                                                     |
| industry                        | TextArea            | `z.enum(Object.values(OrganizationIndustryTypes)).optional()`         | Industry sector                                                                                                                       |
| primaryPhoneNumber              | Phone               | `z.string().optional()`                                               | Primary phone number, formatted as +12345678900                                                                                       |
| employeeCountFrom               | Integer             | `z.number().int().positive().optional()`                              | The min number of employees an organization has.                                                                                      |
| employeeCountTo                 | Integer             | `z.number().int().positive().optional()`                              | The max number of employees an organization has.                                                                                      |
| employeeCount                   | Integer             | `z.number().int().positive().optional()`                              | The number of employees an organization has.                                                                                          |
| doesBusinessWith                | TextArea            | `z.array(z.enum(['B2B', 'B2C', 'B2G'])).optional()`                   | Business model types                                                                                                                  |
| missionAndVision                | TextArea            | `z.string().optional()`                                               | The mission and vision of the organization in one sentence.                                                                           |
| values                          | TextArea            | `z.array(z.string()).optional()`                                      | The organizational values of the organization.                                                                                        |
| differentiators                 | TextArea            | `z.array(z.string()).optional()`                                      | The differentiators of the organization.                                                                                              |
| isHiring                        | Boolean             | `z.boolean().optional()`                                              | Whether the organization is hiring.                                                                                                   |
| industryType                    | TextArea            | `z.string().optional()`                                               | The industry type of the organization.                                                                                                |
| annualRevenue                   | Float               | `z.number().positive().optional()`                                    | The annual revenue of the organization.                                                                                               |
| funding                         | Float               | `z.number().positive().optional()`                                    | The funding the organization has received.                                                                                            |
| location                        | TextArea            | `z.string().optional()`                                               | The location of the organization. This is the city, state, and country.                                                               |
| address                         | TextArea            | `z.string().optional()`                                               | The address of where the organization is located. This is the full street address.                                                    |
| city                            | TextArea            | `z.string().optional()`                                               | The city of where the organization is located.                                                                                        |
| state                           | TextArea            | `z.string().optional()`                                               | The state of where the organization is located.                                                                                       |
| country                         | TextArea            | `z.string().optional()`                                               | The country of where the organization is located.                                                                                     |
| postalCode                      | TextArea            | `z.string().optional()`                                               | The postal code of where the organization is located.                                                                                 |
| photoSquare                     | Url                 | `z.string().optional()`                                               | The square photo of the organization, the url link to it. remember, urls must start with https://                                     |
| stockTicker                     | TextArea            | `z.string().optional()`                                               | The stock ticker symbol of the organization.                                                                                          |
| socialTwitter                   | Url                 | `z.string().optional()`                                               | The twitter url of the organization. remember, urls must start with https://                                                          |
| socialLinkedIn                  | Url                 | `z.string().optional()`                                               | The linkedin url of the organization. remember, urls must start with https://                                                         |
| socialFacebook                  | Url                 | `z.string().optional()`                                               | The facebook url of the organization. remember, urls must start with https://                                                         |
| socialYouTube                   | Url                 | `z.string().optional()`                                               | The youtube url of the organization. remember, urls must start with https://                                                          |
| socialInstagram                 | Url                 | `z.string().optional()`                                               | The instagram url of the organization. remember, urls must start with https://                                                        |
| edgarCik                        | TextArea            | `z.string().optional()`                                               | The edgar cik of the organization.                                                                                                    |
| crunchbaseEntityId              | TextArea            | `z.string().optional()`                                               | The crunchbase id of the organization.                                                                                                |
| linkCrunchbase                  | Url                 | `z.string().optional()`                                               | The crunchbase url of the organization. remember, urls must start with https://                                                       |
| linkAngelList                   | Url                 | `z.string().optional()`                                               | The angellist url of the organization. remember, urls must start with https://                                                        |
| resolvedUrl                     | Url                 | `z.string().optional()`                                               | The resolved url of the organization. Remember, urls must start with https://                                                         |
| opportunityIds                  | TextArea            | `z.array(z.string()).optional()`                                      | The opportunity ids of the organization.                                                                                              |
| status/highLevelSummary         | TextArea            | `z.array(z.string()).optional()`                                      | The Organization Status field provides a concise snapshot of your relationship with each organization...                              |
| status/currentStatusOneSentence | TextArea            | `z.string().optional()`                                               | A single sentence capturing the most crucial aspect of the current relationship...                                                    |
| status/nextSteps                | TextArea            | `z.string().optional()`                                               | Recommended next steps with the organization                                                                                          |
| status/warmth                   | Integer             | `z.number().int().optional()`                                         | Relationship warmth score (calculated)                                                                                                |
| objective/relationshipOrigin    | TextArea            | `z.string().optional()`                                               | How did the two companies meet? was there an email, introduction, meeting, etc?                                                       |
| objective/roles                 | TextArea            | `z.array(z.object({...})).optional()`                                 | The roles of the organization.                                                                                                        |
| hasOpportunity                  | Boolean             | `z.boolean().optional()`                                              | Whether there's an active opportunity with this organization                                                                          |
| traffic                         | Integer             | `z.number().int().optional()`                                         | Estimated monthly website traffic                                                                                                     |
| keywords                        | TextArea            | `z.array(z.string()).optional()`                                      | Keywords associated with the organization                                                                                             |
| news                            | TextArea            | `z.string().optional()`                                               | Recent news about the organization                                                                                                    |

## Person (Contact)

| Property Key        | Property Type | Zod Type                              | Description                                                                                                  |
| ------------------- | ------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| email               | Email         | `z.string().email()`                  | The primary email address of the person. This is the objectId for the person record. Required when creating. |
| firstName           | TextArea      | `z.string().optional()`               | The first name of the person                                                                                 |
| lastName            | TextArea      | `z.string().optional()`               | The last name of the person                                                                                  |
| linkedInUrl         | Url           | `z.string().url().optional()`         | The LinkedIn profile URL of the person. remember, urls must start with https://                              |
| description         | TextArea      | `z.string().optional()`               | The career-focused, usually one-line summary/bio of the person                                               |
| careerSummary       | TextArea      | `z.string().optional()`               | Paragraph-form history of the person's career                                                                |
| canonicalEmail      | Email         | `z.string().email().optional()`       | The canonical email address of the person.                                                                   |
| primaryPhoneNumber  | Phone         | `z.string().optional()`               | The primary phone number of the person. format: +1234567890                                                  |
| location            | TextArea      | `z.string().optional()`               | The physical location of the person                                                                          |
| timezone            | TextArea      | `z.string().optional()`               | The UTC timezone of the person                                                                               |
| country             | TextArea      | `z.string().optional()`               | The country of the person's primary residence                                                                |
| city                | TextArea      | `z.string().optional()`               | The city of the person's primary residence                                                                   |
| state               | TextArea      | `z.string().optional()`               | The state of the person's primary residence                                                                  |
| postalCode          | TextArea      | `z.string().optional()`               | The postal code of the person's primary residence                                                            |
| headline            | TextArea      | `z.string().optional()`               | The headline of the person, this is the person's LinkedIn "headline".                                        |
| industry            | TextArea      | `z.string().optional()`               | The industry of the person.                                                                                  |
| socialFacebook      | Url           | `z.string().url().optional()`         | The Facebook profile URL of the person                                                                       |
| socialTwitter       | Url           | `z.string().url().optional()`         | The X (Twitter) profile URL of the person                                                                    |
| socialGithub        | Url           | `z.string().url().optional()`         | The GitHub profile URL of the person                                                                         |
| socialLinkedIn      | Url           | `z.string().url().optional()`         | The LinkedIn profile URL of the person                                                                       |
| currentCompanyName  | TextArea      | `z.string().optional()`               | The name of the person's current organization.                                                               |
| currentJobTitle     | TextArea      | `z.string().optional()`               | The job title of the person's current organization.                                                          |
| currentJobStartDate | DateTime      | `z.string().optional()`               | The start date of the person's current job.                                                                  |
| skills              | TextArea      | `z.array(z.string()).optional()`      | The skills of the person.                                                                                    |
| languages           | TextArea      | `z.array(z.string()).optional()`      | The languages spoken by the person.                                                                          |
| interests           | TextArea      | `z.array(z.string()).optional()`      | The interests of the person.                                                                                 |
| workExperience      | TextArea      | `z.array(z.object({...})).optional()` | The work experience of the person.                                                                           |
| education           | TextArea      | `z.array(z.object({...})).optional()` | The education of the person.                                                                                 |
| certifications      | TextArea      | `z.array(z.string()).optional()`      | The certifications of the person.                                                                            |
| organization        | Calculated    | `z.string().optional()`               | The person's organization (extracted from email domain)                                                      |
| currentWorkEmail    | Email         | `z.string().email().optional()`       | The person's current work email address                                                                      |
| pastEmails          | TextArea      | `z.array(z.string()).optional()`      | All email addresses associated with this person                                                              |
| phoneNumbers        | TextArea      | `z.array(z.string()).optional()`      | All phone numbers for the person                                                                             |
| photoUrl            | Url           | `z.string().url().optional()`         | Profile photo URL                                                                                            |
| gender              | TextArea      | `z.string().optional()`               | Gender of the person                                                                                         |

### Complex Object Schemas for Person

**workExperience schema:**

```typescript
z.array(
  z.object({
    companyName: z.string(),
    jobTitle: z.string(),
    startDate: z.string(),
    endDate: z.string().nullable(),
    description: z.string(),
  })
);
```

**education schema:**

```typescript
z.array(
  z.object({
    schoolName: z.string(),
    degree: z.string(),
    fieldOfStudy: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  })
);
```

## Pipeline

| Property Key     | Property Type | Zod Type                     | Description                                                       |
| ---------------- | ------------- | ---------------------------- | ----------------------------------------------------------------- |
| title            | TextArea      | `z.string().min(1)`          | The title of the pipeline. Required when creating.                |
| description      | TextArea      | `z.string().optional()`      | The description of the pipeline                                   |
| hasRevenue       | Boolean       | `z.boolean().optional()`     | Whether the pipeline tracks revenue. Required when creating.      |
| type             | TextArea      | `z.enum([...]).optional()`   | The type of pipeline. Required when creating.                     |
| automationActive | Boolean       | `z.boolean().optional()`     | Whether automation is active                                      |
| icpOrganization  | TextArea      | `z.string().optional()`      | Ideal customer profile for organizations. Required when creating. |
| icpMetadata      | TextArea      | `z.object({...}).optional()` | Metadata for Ideal Customer Profile. Required when creating.      |
| icpPeople        | TextArea      | `z.object({...}).optional()` | Role-level professional information for target prospects          |

### Complex Object Schemas for Pipeline

**type enum values:**

- `'NEW_CUSTOMER'`
- `'EXISTING_CUSTOMER'`
- `'FINANCING_INVESTMENT'`
- `'VENTURE_CAPITAL'`
- `'PARTNER'`

**icpMetadata schema:**

```typescript
z.object({
  countries: z.array(z.string()).optional(),
  employeeCountFrom: z.number().int().positive().optional(),
  employeeCountTo: z.number().int().positive().optional(),
  industry: z.array(z.string()).optional(),
  sellingTo: z.array(z.enum(["B2B", "B2C", "B2G"])).optional(),
});
```

**icpPeople schema:**

```typescript
z.object({
  jobTitles: z
    .array(
      z.object({
        department: z.string(),
        track: z.string(),
        level: z.number().int(),
      })
    )
    .optional(),
});
```

## Stage

| Property Key      | Property Type   | Zod Type                              | Description                                                        |
| ----------------- | --------------- | ------------------------------------- | ------------------------------------------------------------------ |
| title             | TextArea        | `z.string().min(1)`                   | Stage title. Required when creating.                               |
| type              | TextArea        | `z.enum(Object.values(StageTypes))`   | The type of stage. Once set, it cannot be changed.                 |
| description       | TextArea        | `z.string().optional()`               | Stage description                                                  |
| expectedRevenue   | Currency        | `z.number().positive().optional()`    | Expected revenue                                                   |
| likelihoodToClose | Percent         | `z.number().min(0).max(1).optional()` | Likelihood to close (0-1). AUTO-ASSIGNED based on stage type.      |
| entranceCriteria  | TextArea        | `z.array(z.string()).optional()`      | Entrance criteria list. PROVIDE MULTIPLE CRITERIA (2-4 per stage). |
| pipelineId        | ObjectReference | `z.string()`                          | The uuid of the pipeline this stage belongs to.                    |
| position          | Integer         | `z.number().int().min(1).optional()`  | Stage position (1-based).                                          |

## Opportunity

| Property Key           | Property Type | Zod Type                                              | Description                                                      |
| ---------------------- | ------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| title                  | TextArea      | `z.string().min(1)`                                   | The title of the opportunity. Required when creating.            |
| stageId                | Picklist      | `z.string()`                                          | The object reference of the stage this opportunity is in.        |
| domain                 | TextArea      | `z.string().optional()`                               | The domain associated with the opportunity.                      |
| roles                  | TextArea      | `z.array(z.object({...})).optional()`                 | The people associated with this opportunity and their roles.     |
| timeframeStart         | DateTime      | `z.string().datetime().optional()`                    | The start date of the opportunity.                               |
| timeframeEnd           | DateTime      | `z.string().datetime().optional()`                    | The end date of the opportunity.                                 |
| expectedCloseDate      | DateTime      | `z.string().datetime().optional()`                    | The expected close date for this opportunity.                    |
| expectedRevenue        | Float         | `z.number().positive().optional()`                    | The expected annual recurring revenue.                           |
| ownerEmail             | Email         | `z.string().email().optional()`                       | The email of the person responsible. MUST be a workspace member. |
| currentStatus          | TextArea      | `z.string().optional()`                               | The current status of the opportunity.                           |
| currentSituation       | TextArea      | `z.array(z.string()).optional()`                      | The current situation of the opportunity.                        |
| goalsAndKPIs           | TextArea      | `z.object({content: z.array(z.string())}).optional()` | The goals and KPIs for this opportunity.                         |
| challengesAndSolutions | TextArea      | `z.array(z.object({...})).optional()`                 | The challenges and solutions for this opportunity.               |
| amount                 | Float         | `z.number().positive().optional()`                    | The deal amount of the opportunity.                              |
| probability            | Float         | `z.number().min(0).max(100).optional()`               | Probability of closing (0-100)                                   |
| organizationName       | TextArea      | `z.string().optional()`                               | The name of the organization                                     |
| description            | TextArea      | `z.string().optional()`                               | A description of the opportunity                                 |
| pipelineId             | ObjectRef     | `z.string().optional()`                               | The pipeline this opportunity belongs to                         |
| pipelineTitle          | TextArea      | `z.string().optional()`                               | The title of the pipeline                                        |
| organizationId         | ObjectRef     | `z.string().optional()`                               | The organization ID this opportunity is for                      |
| type                   | TextArea      | `z.string().optional()`                               | The type of opportunity                                          |
| position               | Integer       | `z.number().int().optional()`                         | Position in the stage                                            |
| daysInStage            | Calculated    | `z.number().int().optional()`                         | Days in current stage (calculated)                               |
| competition            | StringArray   | `z.array(z.string()).optional()`                      | Competitors for this opportunity                                 |
| recommendedStage       | TextArea      | `z.string().optional()`                               | AI-recommended stage                                             |
| autoStageMovement      | Boolean       | `z.boolean().optional()`                              | Whether AI can auto-move this opportunity between stages         |

### Complex Object Schemas for Opportunity

**roles schema:**

```typescript
z.array(
  z.object({
    personEmail: z.string().email(),
    roles: z.array(
      z.enum([
        "ECONOMIC_BUYER",
        "PRIMARY_CONTACT",
        "CHAMPION",
        "SUPPORTER",
        "DETRACTOR",
        "DIRECT_BENEFIT",
      ])
    ),
  })
);
```

**challengesAndSolutions schema:**

```typescript
z.array(
  z.object({
    challenge: z.string(),
    solution: z.string(),
  })
);
```

## Action

| Property Key      | Property Type | Zod Type                                           | Description                                                      |
| ----------------- | ------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| title             | TextArea      | `z.string().optional()`                            | The title of the action. Required for creating.                  |
| status            | Picklist      | `z.enum(Object.values(ActionStatus)).optional()`   | The status of the action. Required when creating.                |
| ownerEmail        | Email         | `z.string().email().optional()`                    | The email of the owner. MUST be a workspace member or assistant. |
| descriptionPoints | TextArea      | `z.array(z.string()).optional()`                   | Bullet points describing the action in detail.                   |
| people            | TextArea      | `z.array(z.string()).optional()`                   | The people's emails for whom the action must be completed.       |
| domains           | Email         | `z.array(z.string()).optional()`                   | The domains for whom the action must be completed.               |
| priority          | Picklist      | `z.enum(Object.values(ActionPriority)).optional()` | The priority of the action.                                      |
| type              | Picklist      | `z.enum(Object.values(ActionType)).optional()`     | The type of the action.                                          |
| timeframeEnd      | DateTime      | `z.string().optional()`                            | The due date of the action.                                      |

## MeetingRecording

| Property Key       | Property Type | Zod Type                         | Description                                                     |
| ------------------ | ------------- | -------------------------------- | --------------------------------------------------------------- |
| title              | TextArea      | `z.string().optional()`          | The title of the meeting                                        |
| description        | TextArea      | `z.string().optional()`          | AI-generated description of the meeting                         |
| topic              | TextArea      | `z.string().optional()`          | The main topic discussed in the meeting                         |
| descriptionBullets | StringArray   | `z.array(z.string()).optional()` | Key points from the meeting as bullet points                    |
| summaryShort       | TextArea      | `z.string().optional()`          | Short summary of the meeting                                    |
| summaryLong        | TextArea      | `z.string().optional()`          | Detailed summary of the meeting                                 |
| notes              | TextArea      | `z.string().optional()`          | AI-generated notes from the meeting (searchable)                |
| transcript/vtt     | TextArea      | `z.string().optional()`          | Full VTT transcript of the meeting                              |
| participants       | TextArea      | `z.array(z.string()).optional()` | All participants in the meeting (email addresses)               |
| domains            | TextArea      | `z.array(z.string()).optional()` | The domains of the organizations of the meeting participants    |
| storedAt           | DateTime      | `z.string().optional()`          | When the recording was stored (use for timeframeField)          |
| userWasInMeeting   | Boolean       | `z.boolean().optional()`         | Whether the current user was a participant                      |
| statusLabel        | Picklist      | `z.string().optional()`          | System status of the recording                                  |
| statusMessage      | TextArea      | `z.string().optional()`          | Status details/message                                          |

**Search Tips:**
- Use `timeframeField: 'storedAt'` to search by when recordings were stored
- Search `notes` or `description` with `contains` operator to find discussions of specific topics
- Use relationship search with `attendee` to find meetings by person or company

## Page

| Property Key       | Property Type | Zod Type                | Description                                                |
| ------------------ | ------------- | ----------------------- | ---------------------------------------------------------- |
| title              | TextArea      | `z.string().optional()` | The title of the page                                      |
| templateType       | TextArea      | `z.string().optional()` | The template type of the page                              |
| publishedForUserAt | DateTime      | `z.string().optional()` | The date and time the page was published for the workspace |
| contentHtml        | TextArea      | `z.string().optional()` | The HTML content of the page                               |

## GmailThread

| Property Key | Property Type | Zod Type                         | Description               |
| ------------ | ------------- | -------------------------------- | ------------------------- |
| summary      | TextArea      | `z.string().optional()`          | The summary of the thread |
| allEmails    | TextArea      | `z.array(z.string()).optional()` | All emails in the thread  |
| allDomains   | TextArea      | `z.array(z.string()).optional()` | All domains in the thread |

## SlackMessage

| Property Key | Property Type | Zod Type                         | Description                                                    |
| ------------ | ------------- | -------------------------------- | -------------------------------------------------------------- |
| body         | TextArea      | `z.string().optional()`          | The body of the message                                        |
| authorEmail  | Email         | `z.string().optional()`          | The email of the person who sent the message                   |
| authorName   | TextArea      | `z.string().optional()`          | The name of the person who sent the message                    |
| authorDomain | TextArea      | `z.string().optional()`          | The domain of the organization of the sender                   |
| domains      | TextArea      | `z.array(z.string()).optional()` | The domains of organizations associated with the Slack Channel |

## Event

| Property Key   | Property Type | Zod Type                         | Description                                       |
| -------------- | ------------- | -------------------------------- | ------------------------------------------------- |
| title          | TextArea      | `z.string().optional()`          | The title of the meeting                          |
| description    | TextArea      | `z.string().optional()`          | The description of the meeting                    |
| attendees      | TextArea      | `z.array(z.string()).optional()` | All attendees of the meeting                      |
| organizerEmail | Email         | `z.string().optional()`          | The email of the person who called the meeting    |
| domains        | TextArea      | `z.array(z.string()).optional()` | The domains of the organizations of the attendees |

## Template

| Property Key     | Property Type | Zod Type                               | Description                                          |
| ---------------- | ------------- | -------------------------------------- | ---------------------------------------------------- |
| type             | Picklist      | `z.enum(Object.values(TemplateTypes))` | The type of template                                 |
| description      | TextArea      | `z.string().optional()`                | The description of what the template is for/contains |
| descriptionShort | TextArea      | `z.string().optional()`                | Short description of the template                    |
| skillset         | Picklist      | `z.string().optional()`                | Template skillset category                           |

### Template Types

- `EMAIL` - Email templates
- `INTERNAL_PAGE` - Internal page templates
- `KNOWLEDGE` - Knowledge base templates

## Thread

| Property Key     | Property Type | Zod Type                | Description                                |
| ---------------- | ------------- | ----------------------- | ------------------------------------------ |
| title            | TextArea      | `z.string().optional()` | The title of the conversation thread       |
| objectReferences | TextArea      | `z.string().optional()` | JSON array of associated object references |
| dismissedObjects | TextArea      | `z.string().optional()` | JSON array of dismissed object IDs         |
| assistantGoal    | TextArea      | `z.string().optional()` | The assistant's goal for the conversation  |
| modelId          | TextArea      | `z.string().optional()` | AI model ID used for the thread            |
| status           | Picklist      | `z.string().optional()` | Thread status                              |

## Draft

| Property Key      | Property Type | Zod Type                              | Description                         |
| ----------------- | ------------- | ------------------------------------- | ----------------------------------- |
| channel           | TextArea      | `z.enum(['EMAIL', 'SLACK'])`          | Channel type for the draft          |
| type              | TextArea      | `z.string().optional()`               | Draft type                          |
| status            | TextArea      | `z.string().optional()`               | Current status of the draft         |
| scheduledSendTime | DateTime      | `z.string().datetime().optional()`    | Scheduled send time for the draft   |

## Context (Notes)

Notes attached to CRM objects.

| Property Key | Property Type | Zod Type                | Description                                |
| ------------ | ------------- | ----------------------- | ------------------------------------------ |
| presence     | TextArea      | `z.string().optional()` | Metadata carrier for the note              |
| summary      | TextArea      | `z.string().optional()` | AI-generated summary of the note content   |

**Note:** To read actual note content, you need to:
1. Search `native_context` with `includeRelationships: true`
2. Get the related `native_page` objectId from the relationships
3. Fetch the page content with a second search using `objectIds`

---

# Object Relationships

Relationships define how objects connect to each other in Day AI. Use relationships with `search_objects` to find objects based on their connections.

## Relationship Search Syntax

When searching by relationship, use this structure in the `where` clause:

```typescript
{
  relationship: string;       // The relationship name (e.g., "attendee", "related")
  targetObjectType: string;   // The type of related object (e.g., "native_contact")
  targetObjectId: string;     // The ID of the target object
  operator: "eq";             // Usually "eq" for relationship matches
}
```

**Important Notes:**
- For `native_contact` targets, use the email address as `targetObjectId` (e.g., "john@acme.com")
- For `native_organization` targets, use the domain as `targetObjectId` (e.g., "acme.com")
- For other object types, use the object's UUID

## Meeting Recording Relationships

| Relationship | Target Type | Description | Example Use Case |
|-------------|-------------|-------------|------------------|
| `attendee` | `native_contact` | People who attended the meeting | Find meetings with a specific person |
| `attendee` | `native_organization` | Organizations represented in the meeting | Find meetings with a specific company |

**Example: Find meetings attended by a person**
```json
{
  "queries": [{
    "objectType": "native_meetingrecording",
    "where": {
      "relationship": "attendee",
      "targetObjectType": "native_contact",
      "targetObjectId": "john@acme.com",
      "operator": "eq"
    }
  }],
  "includeRelationships": true
}
```

**Example: Find meetings with a company**
```json
{
  "queries": [{
    "objectType": "native_meetingrecording",
    "where": {
      "relationship": "attendee",
      "targetObjectType": "native_organization",
      "targetObjectId": "acme.com",
      "operator": "eq"
    }
  }],
  "includeRelationships": true
}
```

## Opportunity Relationships

| Relationship | Target Type | Description | Example Use Case |
|-------------|-------------|-------------|------------------|
| `related` | `native_contact` | People involved in the opportunity | Find opportunities involving a person |
| `related` | `native_organization` | Companies related to the opportunity | Find opportunities with a company |
| `subject` | `native_organization` | Primary company the opportunity is about | Find opportunities for a specific company |
| `stage` | `native_stage` | Current pipeline stage | Find opportunities in a specific stage |
| `assignee` | `native_user` | Deal owner | Find opportunities owned by a user |

**Example: Find opportunities related to a contact**
```json
{
  "queries": [{
    "objectType": "native_opportunity",
    "where": {
      "relationship": "related",
      "targetObjectType": "native_contact",
      "targetObjectId": "john@acme.com",
      "operator": "eq"
    }
  }],
  "includeRelationships": true
}
```

**Example: Find opportunities with a company**
```json
{
  "queries": [{
    "objectType": "native_opportunity",
    "where": {
      "relationship": "related",
      "targetObjectType": "native_organization",
      "targetObjectId": "acme.com",
      "operator": "eq"
    }
  }],
  "includeRelationships": true
}
```

## Pipeline & Stage Relationships

| Source | Relationship | Target | Description |
|--------|-------------|--------|-------------|
| `native_stage` | `pipeline` | `native_pipeline` | Stage belongs to a pipeline |
| `native_pipeline` | `stage` | `native_stage` | Pipeline contains stages |
| `native_opportunity` | `stage` | `native_stage` | Opportunity is in a stage |

**Best Practice:** When querying pipelines/stages/opportunities:
1. Search for the pipeline first
2. Use `includeRelationships: true` to get stages
3. Search opportunities by stage ID

## Context (Notes) Relationships

| Relationship | Target Type | Description |
|-------------|-------------|-------------|
| `parent` | `native_contact` | Note attached to a person |
| `parent` | `native_organization` | Note attached to a company |
| `parent` | `native_opportunity` | Note attached to a deal |
| `parent` | `native_meetingrecording` | Note attached to a meeting |

**Example: Find notes on an organization**
```json
{
  "queries": [{
    "objectType": "native_context",
    "where": {
      "relationship": "parent",
      "targetObjectType": "native_organization",
      "targetObjectId": "acme.com",
      "operator": "eq"
    }
  }],
  "includeRelationships": true
}
```

## Email Thread Relationships

| Relationship | Target Type | Description |
|-------------|-------------|-------------|
| `recipient` | `native_contact` | People on the email thread |
| `recipient` | `native_organization` | Organizations on the email thread |
| `sender` | `native_contact` | Last sender of the thread |

## Calendar Event Relationships

| Relationship | Target Type | Description |
|-------------|-------------|-------------|
| `attendee` | `native_contact` | People invited to the event |
| `attendee` | `native_organization` | Organizations represented |
| `organizer` | `native_contact` | Event organizer |

## Person-Organization Relationships

| Relationship | Target Type | Description |
|-------------|-------------|-------------|
| `organization` | `native_organization` | Person's employer |
| `member` | `native_contact` | Organization's employees |

## Action (Task) Relationships

| Relationship | Target Type | Description |
|-------------|-------------|-------------|
| `related` | `native_opportunity` | Related opportunity |
| `assignee` | `native_user` | Task owner |
| `related` | `native_contact` | Related person |
| `related` | `native_organization` | Related company |

## Template Relationships

| Relationship | Target Type | Description |
|-------------|-------------|-------------|
| `content` | `native_page` | Template content (the actual page with HTML) |

**Best Practice for Templates:**
1. Search `native_template` with `includeRelationships: true`
2. Extract the `native_page` objectId from the content relationship
3. Search `native_page` with `objectIds` to get the actual content

## Gmail Message Relationships

| Relationship | Target Type | Description |
|-------------|-------------|-------------|
| `sender` | `native_contact` | Person who sent the message |
| `sender` | `native_organization` | Organization of the sender |
| `recipient` | `native_contact` | People who received the message |
| `recipient` | `native_organization` | Organizations of recipients |

## Slack Message Relationships

| Relationship | Target Type | Description |
|-------------|-------------|-------------|
| `author` | `native_contact` | Person who sent the message |
| `author` | `native_organization` | Organization of the author |
| `present` | `native_organization` | Organizations present in the channel |

## Draft Relationships

| Relationship | Target Type | Description |
|-------------|-------------|-------------|
| `content` | `native_page` | Draft content (HTML body) |
| `hasRecipient` | `native_contact` | Recipients of the draft |
| `parent` | `native_thread` | Thread that generated the draft |
| `parent` | `native_action` | Action that generated the draft |

## Page Relationships

| Relationship | Target Type | Description |
|-------------|-------------|-------------|
| `creator` | `native_user` | User who created the page |
| `creator` | `native_assistant` | Assistant that created the page |

## Thread Relationships

| Relationship | Target Type | Description |
|-------------|-------------|-------------|
| `creator` | `native_user` | User who started the thread |
| `assistant` | `native_assistant` | Assistant handling the thread |
| `source` | Various | Object the thread is about (Contact, Organization, Opportunity, etc.) |
| `message` | `native_threadmessage` | Messages in the thread |

## Inverse Relationships Reference

Many relationships are bidirectional. Here are common inverse lookups:

| If you search... | Relationship | You can also search the inverse... |
|-----------------|--------------|-----------------------------------|
| MeetingRecording → Contact | `attendee` | Contact → MeetingRecording via `attended` |
| Opportunity → Organization | `related` | Organization → Opportunity via `involved in` |
| Context → Organization | `parent` | Organization → Context via `has note` |
| Organization → Person | `member` | Person → Organization via `organization` |
| Stage → Pipeline | `pipeline` | Pipeline → Stage via `stage` |
| Opportunity → Stage | `stage` | Stage → Opportunity via `opportunity` |
