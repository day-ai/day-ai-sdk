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
} from './types';

// Re-export the client as default export
export { DayAIClient as default } from './client';
