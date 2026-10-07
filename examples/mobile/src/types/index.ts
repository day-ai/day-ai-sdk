// Chat types

export type ChatState =
  | 'idle'           // Ready to send a message
  | 'sending'        // Sending user message
  | 'thinking'       // Waiting for Claude to start responding
  | 'streaming';     // Receiving streaming response from Claude

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
  result?: any;
  status: 'pending' | 'success' | 'error';
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface ChatHookState {
  chatState: ChatState;
  messages: ChatMessage[];
  currentResponse: string;
  error: string | null;
  dayAIConnected: boolean;
  currentToolCalls?: ToolCall[];
}

// Settings types

export type ClaudeModel = 'claude-sonnet-5-5' | 'claude-opus-5-5' | 'claude-haiku-5-5';

export const DEFAULT_MODEL: ClaudeModel = 'claude-sonnet-5-5';

export const SUPPORTED_MODELS: ClaudeModel[] = [
  'claude-sonnet-5-5',
  'claude-opus-5-5',
  'claude-haiku-5-5',
];

// Saved settings may hold a model ID from an older version of the app.
export function normalizeModel(model: string | undefined): ClaudeModel {
  return SUPPORTED_MODELS.includes(model as ClaudeModel)
    ? (model as ClaudeModel)
    : DEFAULT_MODEL;
}

export interface AppSettings {
  anthropicApiKey: string;
  model: ClaudeModel;
}

// Day AI types (re-export from services for convenience)

export type { DayAICredentials, ConnectionStatus } from '../services/DayAIService';
