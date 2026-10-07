// Searchable object types (see SCHEMA.md). `read_crm_schema` is authoritative.
export type ObjectType =
  | 'native_contact'
  | 'native_organization'
  | 'native_opportunity'
  | 'native_pipeline'
  | 'native_stage'
  | 'native_meetingrecording'
  | 'native_meetingrecordingclip'
  | 'native_calendarevent'
  | 'native_emailmessage'
  | 'native_action'
  | 'native_page'
  | 'native_context'
  | 'native_draft'
  | 'native_campaign'
  | 'native_campaignmemberstatus'
  | 'native_template'
  | 'native_thread'
  | 'native_slackchannel'
  | 'native_slackmessage'
  | 'native_list'
  | 'native_file'
  | 'native_folder'
  | 'native_view'
  | 'native_user'
  | 'native_assistant'
  | 'native_instruction'
  | 'native_webpage'
  | 'native_workspace'
  /** @deprecated Use 'native_emailmessage'. */
  | 'native_gmailthread'
  /** @deprecated Use 'native_emailmessage'. */
  | 'native_gmailmessage';

// Filter operators
export type Operator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'is'
  | 'isAnyOf'
  | 'containsAnyOf'
  | 'containsAllOf'
  | 'isNull'
  | 'isNotNull';

// Where clause types
export interface PropertyFilter {
  propertyId: string;
  operator: Operator;
  /** A string, or a string array for isAnyOf / containsAnyOf / containsAllOf. */
  value?: string | string[];
}

export interface RelationshipFilter {
  relationship: string;
  targetObjectType: string;
  /**
   * The target's objectId, from a previous search. Contacts and organizations
   * are UUIDs. Only native_emailmessage and native_calendarevent take an email
   * address or domain here.
   */
  targetObjectId: string;
  operator: 'eq' | 'neq';
}

export type WhereCondition =
  | PropertyFilter
  | RelationshipFilter
  | { AND: WhereCondition[] }
  | { OR: WhereCondition[] };

// Search query and options
export interface SearchQuery {
  objectType: ObjectType | string;
  objectIds?: string[];
  where?: WhereCondition;
}

export interface SearchOptions {
  description?: string;
  offset?: number;
  timeframeStart?: string;
  timeframeEnd?: string;
  timeframeField?: 'createdAt' | 'updatedAt' | 'storedAt' | 'time' | 'writtenAt';
  propertiesToReturn?: string[] | '*';
  includeRelationships?: boolean;
  paginationMode?: 'offset' | 'cursor';
  cursor?: { objectType: string; afterId: string };
  cursorPageSize?: number;
}

// Search response types
export interface SearchResultRelationship {
  objectType: string;
  objectId: string;
  title: string;
  description?: string;
  relationship: string;
}

export interface SearchResultObject {
  objectId: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  properties?: Record<string, any>;
  relationships?: SearchResultRelationship[];
}

export interface SearchResultSet {
  totalCount: number;
  results: SearchResultObject[];
}

export interface SearchResponse {
  /** Results keyed by object type, e.g. response.native_contact.results. */
  [objectType: string]: SearchResultSet | any;
  status?: 'partial' | 'complete';
  returnedCount?: number;
  totalRecords?: number;
  hasMore?: boolean;
  nextOffset?: number;
  nextCursor?: { objectType: string; afterId: string };
  paginationNote?: string;
}

// Convenience method input types
export interface CustomPropertyValue {
  /** The custom property's definition UUID, from read_crm_schema. */
  propertyId: string;
  /** Option UUIDs (not labels) for picklists; an array for multi-select. */
  value: string | number | boolean | string[] | null;
  reasoning?: string;
}

export interface CreatePersonInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  currentJobTitle?: string;
  currentCompanyName?: string;
  linkedInUrl?: string;
  primaryPhoneNumber?: string;
  phoneNumbers?: string[];
  /** Any other standard property listed by read_crm_schema. */
  [property: string]: unknown;
  customProperties?: CustomPropertyValue[];
}

export interface CreateOrganizationInput {
  name?: string;
  domain?: string;
  description?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  /** Any other standard property listed by read_crm_schema. */
  [property: string]: unknown;
  customProperties?: CustomPropertyValue[];
}

export type OpportunityRole =
  | 'ECONOMIC_BUYER'
  | 'PRIMARY_CONTACT'
  | 'CHAMPION'
  | 'SUPPORTER'
  | 'DETRACTOR'
  | 'DIRECT_BENEFIT';

export interface CreateOpportunityInput {
  title: string;
  /** objectId of a native_stage. */
  stageId: string;
  /** objectId of the organization. Preferred over domain. */
  organizationId?: string;
  /** Business domain, e.g. acme.com. Freemail domains are rejected. */
  domain?: string;
  ownerEmail?: string;
  /** YYYY-MM-DD */
  timeframeStart?: string;
  /** YYYY-MM-DD */
  timeframeEnd?: string;
  roles?: Array<{ personEmail: string; roles: OpportunityRole[] }>;
  /** Any other writable standard property listed by read_crm_schema. */
  [property: string]: unknown;
  customProperties?: CustomPropertyValue[];
}

export interface SendNotificationInput {
  channel: 'email' | 'slack' | 'both';
  emailSubject?: string;
  emailBody?: string;
  slackParagraphs?: string[];
  reasoning: string;
  slackChannelId?: string;
}
