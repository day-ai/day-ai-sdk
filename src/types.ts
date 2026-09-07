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
  slackFormatting?: 'plain_text' | 'mrkdwn';
  slackParagraphs?: string[];
  reasoning: string;
  slackChannelId?: string;
}

// Pages
export interface CreatePageInput {
  title: string;
  pageHtmlContent: string;
  publishedForUserAt?: string;
  isTemplate?: boolean;
}

export interface CreatePageResult {
  page?: { id: string; title?: string };
  focusObject?: {
    objectId: string;
    objectType: string;
    workspaceId: string;
  };
  [key: string]: any;
}

export interface UpdatePageInput {
  pageId: string;
  title?: string;
  pageHtmlContent?: string;
  /** Exact substring of the current content to replace (targeted edit / full-replace guard). */
  oldContentMatch?: string;
  /** Fetch the latest page content immediately before updating (full-replace without oldContentMatch). */
  refreshFirst?: boolean;
  publishedForUserAt?: string | null;
}

export interface ReadPageResult {
  objectId: string;
  title: string;
  contentHtml: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  [key: string]: any;
}

// Page images
export type PageImageMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/webp';

export interface PageImageUploadTarget {
  blobId: string;
  /** Pre-signed S3 PUT URL. Expires in expiresInSeconds — upload immediately. */
  uploadUrl: string;
  maxSizeBytes: number;
  expiresInSeconds: number;
  nextStep?: string;
}

export interface PageImageAttachment {
  fileId: string;
  filename: string;
  mimeType: string;
  contentLength: number;
  /** Signed, expiring link for viewing the image directly. */
  previewUrl: string;
  /** <img> snippet to embed verbatim in the page's HTML content. */
  imageHtml: string;
  message?: string;
}

export interface UploadPageImageOptions {
  mimeType: PageImageMimeType;
  filename: string;
}

export interface AddImageToPageOptions extends UploadPageImageOptions {
  /** Optional caption paragraph rendered under the image. */
  caption?: string;
}
