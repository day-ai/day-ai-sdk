// Searchable object types (from SCHEMA.md)
export type ObjectType =
  | 'native_contact'
  | 'native_organization'
  | 'native_opportunity'
  | 'native_pipeline'
  | 'native_stage'
  | 'native_meetingrecording'
  | 'native_action'
  | 'native_page'
  | 'native_gmailthread'
  | 'native_gmailmessage'
  | 'native_calendarevent'
  | 'native_context'
  | 'native_template'
  | 'native_view'
  | 'native_slackchannel'
  | 'native_slackmessage'
  | 'native_thread'
  | 'native_draft';

// Filter operators
export type Operator =
  | 'eq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'is'
  | 'isNull'
  | 'isNotNull';

// Where clause types
export interface PropertyFilter {
  propertyId: string;
  operator: Operator;
  value?: string;
}

export interface RelationshipFilter {
  relationship: string;
  targetObjectType: string;
  targetObjectId: string;
  operator: Operator;
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
  timeframeField?: 'createdAt' | 'updatedAt' | 'storedAt';
  propertiesToReturn?: string[] | '*';
  includeRelationships?: boolean;
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
  [objectType: string]: SearchResultSet | boolean | number | undefined;
  hasMore?: boolean;
  nextOffset?: number;
}

// Keyword search types
export interface KeywordSearchQuery {
  objectType: 'native_contact' | 'native_organization' | 'native_opportunity' | 'native_pipeline' | 'native_meetingrecording' | 'native_page';
  keywords: string[];
  limit?: number;
  searchIntent?: 'find_specific' | 'explore_many';
}

// Convenience method input types
export interface CreatePersonInput {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers?: string[];
  jobTitle?: string;
  linkedInUrl?: string;
  customProperties?: Array<{ propertyId: string; value: any }>;
}

export interface CreateOrganizationInput {
  domain: string;
  name?: string;
  url?: string;
  industry?: string;
  employeeCount?: number;
  revenue?: number;
  customProperties?: Array<{ propertyId: string; value: any }>;
}

export interface CreateOpportunityInput {
  title: string;
  stageId: string;
  domain: string;
  ownerEmail?: string;
  expectedRevenue?: number;
  expectedCloseDate?: string;
  primaryPerson?: string;
  roles?: Array<{ personEmail: string; roles: string[]; reasoning?: string }>;
  customProperties?: Array<{ propertyId: string; value: any }>;
}

export interface SendNotificationInput {
  channel: 'email' | 'slack' | 'both';
  emailSubject?: string;
  emailBody?: string;
  slackParagraphs?: string[];
  reasoning: string;
  sendAt?: string;
}
