// Chat Hook - manages the full chat conversation flow with streaming and tool execution
import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, ChatState, ChatHookState, ToolCall } from '../types';
import { claudeService, dayAIService } from '../services';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MESSAGES_STORAGE_KEY = '@day_ai_mobile:messages';
const SETTINGS_STORAGE_KEY = '@day_ai_mobile:settings';

const initialState: ChatHookState = {
  chatState: 'idle',
  messages: [],
  currentResponse: '',
  error: null,
  dayAIConnected: false,
  currentToolCalls: [],
};

export function useChat() {
  const [state, setState] = useState<ChatHookState>(initialState);
  const [apiKey, setApiKey] = useState<string>('');
  const messagesRef = useRef<ChatMessage[]>([]);
  const isStreamingRef = useRef(false);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = state.messages;
  }, [state.messages]);

  // Load saved messages and settings on mount
  useEffect(() => {
    loadPersistedData();
    checkDayAIConnection();
  }, []);

  // Check Day AI connection status
  const checkDayAIConnection = async () => {
    const connected = dayAIService.isConnected();
    setState((prev) => ({ ...prev, dayAIConnected: connected }));
  };

  // Save messages whenever they change
  useEffect(() => {
    if (state.messages.length > 0) {
      saveMessages(state.messages);
    }
  }, [state.messages]);

  const loadPersistedData = async () => {
    try {
      // Load messages
      const savedMessages = await AsyncStorage.getItem(MESSAGES_STORAGE_KEY);
      if (savedMessages) {
        const messages = JSON.parse(savedMessages);
        setState((prev) => ({ ...prev, messages }));
      }

      // Load settings
      const savedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.anthropicApiKey) {
          setApiKey(settings.anthropicApiKey);
          claudeService.initialize(settings.anthropicApiKey);
        }
        if (settings.model) {
          claudeService.setModel(settings.model);
        }
      }
    } catch (error) {
      console.error('[useChat] Failed to load persisted data:', error);
    }
  };

  const saveMessages = async (messages: ChatMessage[]) => {
    try {
      await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('[useChat] Failed to save messages:', error);
    }
  };

  const setChatState = (chatState: ChatState) => {
    setState((prev) => ({ ...prev, chatState }));
  };

  const setError = (error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  };

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }));
    return newMessage;
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      if (!apiKey) {
        setError('Please set your Anthropic API key in Settings');
        return;
      }

      try {
        setError(null);
        isStreamingRef.current = true;

        // Add user message
        addMessage({
          role: 'user',
          content: text,
        });

        setChatState('thinking');

        // Get MCP tools if connected to Day AI
        const tools = state.dayAIConnected ? dayAIService.getTools() : [];

        // Start streaming from Claude
        let fullResponse = '';
        const toolCalls: ToolCall[] = [];
        setState((prev) => ({ ...prev, currentResponse: '', currentToolCalls: [] }));

        const stream = claudeService.chatStream(
          text,
          messagesRef.current,
          apiKey,
          tools
        );

        for await (const chunk of stream) {
          if (!isStreamingRef.current) {
            // Streaming was cancelled
            break;
          }

          if (chunk.type === 'text' && chunk.text) {
            fullResponse += chunk.text;
            setState((prev) => ({
              ...prev,
              chatState: 'streaming',
              currentResponse: fullResponse,
            }));
          } else if (chunk.type === 'tool_use' && chunk.toolCall) {
            // Handle tool call from Claude
            console.log('[useChat] Tool call:', chunk.toolCall);

            const toolCall: ToolCall = {
              id: chunk.toolCall.id,
              name: chunk.toolCall.name,
              input: chunk.toolCall.input,
              status: 'pending',
              startTime: Date.now(),
            };

            toolCalls.push(toolCall);
            setState((prev) => ({
              ...prev,
              currentToolCalls: [...toolCalls],
            }));

            // Execute tool via Day AI service
            try {
              const result = await dayAIService.executeTool(
                chunk.toolCall.name,
                chunk.toolCall.input
              );

              // Update tool call with result
              toolCall.status = 'success';
              toolCall.result = dayAIService.formatToolResult(
                chunk.toolCall.name,
                result
              );
              toolCall.endTime = Date.now();
            } catch (toolError) {
              console.error('[useChat] Tool execution error:', toolError);
              toolCall.status = 'error';
              toolCall.error =
                toolError instanceof Error
                  ? toolError.message
                  : 'Tool execution failed';
              toolCall.endTime = Date.now();
            }

            setState((prev) => ({
              ...prev,
              currentToolCalls: [...toolCalls],
            }));
          } else if (chunk.type === 'error') {
            setError(chunk.error || 'An error occurred');
            setChatState('idle');
            return;
          } else if (chunk.type === 'done') {
            // Streaming complete
            break;
          }
        }

        // Add assistant message with tool calls
        if (fullResponse.trim() || toolCalls.length > 0) {
          addMessage({
            role: 'assistant',
            content: fullResponse || 'Used tools to complete your request.',
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          });
        }

        setState((prev) => ({
          ...prev,
          currentResponse: '',
          currentToolCalls: [],
        }));
        setChatState('idle');
      } catch (error) {
        console.error('[useChat] Chat error:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
        setChatState('idle');
      } finally {
        isStreamingRef.current = false;
      }
    },
    [apiKey, state.dayAIConnected]
  );

  const cancelStreaming = useCallback(() => {
    isStreamingRef.current = false;
    setState((prev) => ({ ...prev, currentResponse: '' }));
    setChatState('idle');
  }, []);

  const clearMessages = useCallback(async () => {
    setState((prev) => ({ ...prev, messages: [] }));
    try {
      await AsyncStorage.removeItem(MESSAGES_STORAGE_KEY);
    } catch (error) {
      console.error('[useChat] Failed to clear messages:', error);
    }
  }, []);

  const updateSettings = useCallback(
    async (newApiKey: string, model?: string) => {
      setApiKey(newApiKey);
      claudeService.initialize(newApiKey);
      if (model) {
        claudeService.setModel(model);
      }

      try {
        await AsyncStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify({
            anthropicApiKey: newApiKey,
            model: model || 'claude-sonnet-4-20250514',
          })
        );
      } catch (error) {
        console.error('[useChat] Failed to save settings:', error);
      }
    },
    []
  );

  const connectDayAI = useCallback(
    async (credentials: { clientId: string; clientSecret: string; refreshToken: string }) => {
      try {
        await dayAIService.connect(credentials);
        await checkDayAIConnection();
        return { success: true };
      } catch (error) {
        console.error('[useChat] Day AI connection failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Connection failed',
        };
      }
    },
    []
  );

  const disconnectDayAI = useCallback(async () => {
    try {
      await dayAIService.disconnect();
      await checkDayAIConnection();
    } catch (error) {
      console.error('[useChat] Day AI disconnect failed:', error);
    }
  }, []);

  return {
    ...state,
    apiKey,
    sendMessage,
    cancelStreaming,
    clearMessages,
    updateSettings,
    connectDayAI,
    disconnectDayAI,
  };
}
