export {
  DayAIClient,
  type DayAIConfig,
  type ApiResponse,
  type TokenResponse,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type McpTool,
  type McpToolResult
} from './client';

export type {
  ObjectType,
  Operator,
  PropertyFilter,
  RelationshipFilter,
  WhereCondition,
  SearchQuery,
  SearchOptions,
  SearchResultObject,
  SearchResultRelationship,
  SearchResultSet,
  SearchResponse,
  CreatePersonInput,
  CreateOrganizationInput,
  CreateOpportunityInput,
  SendNotificationInput,
  CreatePageInput,
  CreatePageResult,
  UpdatePageInput,
  ReadPageResult,
  PageImageMimeType,
  PageImageUploadTarget,
  PageImageAttachment,
  UploadPageImageOptions,
  AddImageToPageOptions,
} from './types';

export {
  buildPageImageHtml,
  escapeHtmlAttribute,
  PAGE_IMAGE_FILE_ID_ATTR,
  PAGE_IMAGE_STABLE_SRC_PREFIX,
} from './pageImages';

// Re-export the client as default export
export { DayAIClient as default } from './client';
