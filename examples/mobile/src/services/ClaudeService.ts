// Claude AI Service with streaming support
import Anthropic from '@anthropic-ai/sdk';
import { Platform } from 'react-native';
import type { ChatMessage } from '../types';

interface StreamChunk {
  type: 'text' | 'tool_use' | 'error' | 'done';
  text?: string;
  toolCall?: {
    id: string;
    name: string;
    input: any;
  };
  error?: string;
}

export class ClaudeService {
  private client: Anthropic | null = null;
  private model: string = 'claude-sonnet-4-20250514';

  constructor(apiKey?: string) {
    if (apiKey) {
      this.initialize(apiKey);
    }
  }

  initialize(apiKey: string): void {
    console.log('[ClaudeService] Initialize called on platform:', Platform.OS);
    console.log('[ClaudeService] API key provided:', apiKey ? `${apiKey.substring(0, 10)}...` : 'none');

    // Only initialize on native platforms
    // Web will use proxy
    if (Platform.OS !== 'web') {
      this.client = new Anthropic({
        apiKey,
      });
      console.log('[ClaudeService] Anthropic client created for native platform');
    } else {
      console.log('[ClaudeService] Skipping client init on web (will use proxy)');
    }
  }

  setModel(model: string): void {
    this.model = model;
  }

  async *chatStream(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    apiKey?: string,
    tools?: any[]
  ): AsyncGenerator<StreamChunk> {
    // Build messages array from history
    const messages: Anthropic.MessageParam[] = conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    try {
      // Always use proxy for now - SDK has issues in React Native
      // In production, you could use direct SDK on native with proper polyfills
      yield* this.streamViaProxy(messages, apiKey, tools);
    } catch (error) {
      console.error('[ClaudeService] Stream error:', error);
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  }

  private async *streamViaSdk(
    messages: Anthropic.MessageParam[],
    tools?: any[]
  ): AsyncGenerator<StreamChunk> {
    if (!this.client) {
      throw new Error('Claude client not initialized');
    }

    console.log('[ClaudeService] Starting SDK stream with model:', this.model);
    console.log('[ClaudeService] Client initialized:', !!this.client);

    const requestParams: any = {
      model: this.model,
      max_tokens: 4096,
      system: this.getSystemPrompt(!!tools),
      messages,
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestParams.tools = tools;
    }

    try {
      const stream = await this.client.messages.stream(requestParams);

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            yield {
              type: 'text',
              text: event.delta.text,
            };
          }
        } else if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            yield {
              type: 'tool_use',
              toolCall: {
                id: event.content_block.id,
                name: event.content_block.name,
                input: event.content_block.input,
              },
            };
          }
        } else if (event.type === 'message_stop') {
          yield { type: 'done' };
        }
      }
    } catch (error: any) {
      console.error('[ClaudeService] SDK stream error details:', {
        message: error.message,
        status: error.status,
        type: error.type,
        error: error.error,
      });
      throw error;
    }
  }

  private async *streamViaProxy(
    messages: Anthropic.MessageParam[],
    apiKey?: string,
    tools?: any[]
  ): AsyncGenerator<StreamChunk> {
    const proxyUrl = process.env.PROXY_URL || 'http://localhost:3001';

    const requestBody: any = {
      model: this.model,
      max_tokens: 4096,
      system: this.getSystemPrompt(!!tools),
      messages,
      stream: true,
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
    }

    console.log('[ClaudeService] Streaming via proxy:', proxyUrl);
    console.log('[ClaudeService] Has API key:', !!apiKey);

    const response = await fetch(`${proxyUrl}/api/anthropic/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[ClaudeService] Proxy response status:', response.status);
    console.log('[ClaudeService] Proxy response ok:', response.ok);
    console.log('[ClaudeService] Has response.body:', !!response.body);
    console.log('[ClaudeService] Response type:', typeof response.body);

    if (!response.ok) {
      const error = await response.text();
      console.error('[ClaudeService] Proxy error response:', error);
      throw new Error(`API request failed: ${error}`);
    }

    // React Native doesn't support response.body.getReader()
    // Read the full text response instead
    const fullText = await response.text();
    console.log('[ClaudeService] Received full response, length:', fullText.length);

    const lines = fullText.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          yield { type: 'done' };
          return;
        }

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'content_block_delta') {
            if (parsed.delta?.type === 'text_delta') {
              yield {
                type: 'text',
                text: parsed.delta.text,
              };
            }
          } else if (parsed.type === 'content_block_start') {
            if (parsed.content_block?.type === 'tool_use') {
              yield {
                type: 'tool_use',
                toolCall: {
                  id: parsed.content_block.id,
                  name: parsed.content_block.name,
                  input: parsed.content_block.input,
                },
              };
            }
          } else if (parsed.type === 'message_stop') {
            yield { type: 'done' };
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    yield { type: 'done' };
  }

  private getSystemPrompt(hasTools: boolean = false): string {
    const basePrompt = `You are Day, a friendly and helpful AI assistant. You're chatting with a user via a mobile app.

Key behaviors:
- Keep responses concise and conversational
- Be warm, engaging, and personable
- Provide clear, actionable information
- If asked to do something you can't do, explain briefly and offer alternatives
- Remember context from the conversation

You help users with:
- Answering questions and providing information
- Brainstorming and creative thinking
- Problem-solving and advice
- General conversation`;

    if (hasTools) {
      return basePrompt + `

You also have access to Day AI's CRM platform via MCP tools. You can:
- Search for contacts, organizations, and opportunities
- Get detailed context about CRM objects
- Create and update records
- Review meeting notes and recordings
- Access workspace data

When users ask about their CRM data, use the appropriate tools to help them. Always explain what you're doing when using tools.`;
    }

    return basePrompt;
  }
}

export const claudeService = new ClaudeService();
