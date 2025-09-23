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
| objective/relationshipOrigin    | TextArea            | `z.string().optional()`                                               | How did the two companies meet? was there an email, introduction, meeting, etc?                                                       |
| objective/roles                 | TextArea            | `z.array(z.object({...})).optional()`                                 | The roles of the organization.                                                                                                        |

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

| Property Key | Property Type | Zod Type                         | Description                                                  |
| ------------ | ------------- | -------------------------------- | ------------------------------------------------------------ |
| summary      | TextArea      | `z.string().optional()`          | The summary of the meeting recording for search              |
| people       | TextArea      | `z.array(z.string()).optional()` | All participants in the meeting recording                    |
| domains      | TextArea      | `z.array(z.string()).optional()` | The domains of the organizations of the meeting participants |

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

| Property Key | Property Type | Zod Type                               | Description                                          |
| ------------ | ------------- | -------------------------------------- | ---------------------------------------------------- |
| description  | TextArea      | `z.enum(Object.values(TemplateTypes))` | The description of what the template is for/contains |
| type         | Picklist      | `z.enum(Object.values(TemplateTypes))` | The type of the                                      |
