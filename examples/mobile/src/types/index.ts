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

export interface AppSettings {
  anthropicApiKey: string;
  model: 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514';
}

// Day AI types (re-export from services for convenience)

export type { DayAICredentials, ConnectionStatus } from '../services/DayAIService';
