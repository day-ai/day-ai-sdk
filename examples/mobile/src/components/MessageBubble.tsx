// MessageBubble - displays a single chat message
import React from 'react';
import { View, Text } from 'react-native';
import { GlassView } from './GlassView';
import { ToolCallDisplay } from './ToolCallDisplay';
import type { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View
      className={`mb-3 max-w-[85%] ${isUser ? 'self-end' : 'self-start'}`}
    >
      <GlassView
        intensity={40}
        tint="light"
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: isUser
            ? 'rgba(74, 154, 154, 0.15)'
            : 'rgba(255, 255, 255, 0.6)',
          borderWidth: 1,
          borderColor: isUser
            ? 'rgba(74, 154, 154, 0.3)'
            : 'rgba(255, 255, 255, 0.8)',
        }}
      >
        <View className="px-4 py-3">
          <Text
            className={`text-base ${
              isUser ? 'text-primary-800' : 'text-gray-800'
            }`}
          >
            {message.content}
          </Text>

          {/* Tool calls display */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <View className="mt-3">
              <Text className="text-xs font-semibold text-gray-600 mb-2">
                Tools Used:
              </Text>
              {message.toolCalls.map((toolCall) => (
                <ToolCallDisplay key={toolCall.id} toolCall={toolCall} />
              ))}
            </View>
          )}
        </View>
      </GlassView>

      {/* Timestamp - shown on long press in future */}
      {/* <Text className="text-xs text-gray-400 mt-1 px-2">
        {new Date(message.timestamp).toLocaleTimeString()}
      </Text> */}
    </View>
  );
}
