export {
  DayAIClient,
  type DayAIConfig,
  type RefreshedTokens,
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

export {
  createPkcePair,
  pkceChallenge,
  buildAuthorizeUrl,
  type PkcePair,
  type AuthorizeUrlParams,
} from './pkce';

// Re-export the client as default export
export { DayAIClient as default } from './client';
