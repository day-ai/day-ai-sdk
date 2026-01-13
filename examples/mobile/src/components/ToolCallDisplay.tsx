// ToolCallDisplay - visualize MCP tool calls
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from './GlassView';
import type { ToolCall } from '../types';

interface ToolCallDisplayProps {
  toolCall: ToolCall;
}

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = () => {
    switch (toolCall.status) {
      case 'pending':
        return '#f59e0b'; // amber
      case 'success':
        return '#10b981'; // green
      case 'error':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'pending':
        return 'hourglass-outline';
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const formatToolName = (name: string) => {
    // Convert snake_case to Title Case
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDuration = () => {
    if (!toolCall.startTime || !toolCall.endTime) return null;
    const duration = toolCall.endTime - toolCall.startTime;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  return (
    <Pressable onPress={() => setExpanded(!expanded)}>
      <GlassView
        intensity={40}
        tint="light"
        className="rounded-xl overflow-hidden mb-2"
        style={{
          backgroundColor: 'rgba(74, 154, 154, 0.05)',
          borderWidth: 1,
          borderColor: 'rgba(74, 154, 154, 0.2)',
        }}
      >
        <View className="p-3">
          {/* Tool header */}
          <View className="flex-row items-center mb-1">
            <Ionicons
              name="construct"
              size={16}
              color="#4a9a9a"
              style={{ marginRight: 6 }}
            />
            <Text className="text-sm font-semibold text-primary-700 flex-1">
              {formatToolName(toolCall.name)}
            </Text>
            <Ionicons
              name={getStatusIcon() as any}
              size={16}
              color={getStatusColor()}
            />
          </View>

          {/* Status text */}
          {toolCall.status === 'pending' && (
            <Text className="text-xs text-gray-600 mb-1">
              Executing tool...
            </Text>
          )}

          {toolCall.status === 'success' && toolCall.result && (
            <Text className="text-xs text-green-700 mb-1">
              {typeof toolCall.result === 'string'
                ? toolCall.result
                : `Completed ${formatDuration() ? `in ${formatDuration()}` : ''}`}
            </Text>
          )}

          {toolCall.status === 'error' && (
            <Text className="text-xs text-red-600 mb-1">
              {toolCall.error || 'Tool execution failed'}
            </Text>
          )}

          {/* Expand indicator */}
          {!expanded && (
            <View className="flex-row items-center mt-1">
              <Text className="text-xs text-gray-400 flex-1">
                Tap to view details
              </Text>
              <Ionicons name="chevron-down" size={14} color="#9ca3af" />
            </View>
          )}

          {/* Expanded details */}
          {expanded && (
            <View className="mt-2 pt-2 border-t border-gray-200">
              {/* Input */}
              <View className="mb-2">
                <Text className="text-xs font-semibold text-gray-700 mb-1">
                  Input:
                </Text>
                <View
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
                >
                  <Text className="text-xs text-gray-600 font-mono">
                    {JSON.stringify(toolCall.input, null, 2)}
                  </Text>
                </View>
              </View>

              {/* Result */}
              {toolCall.result && toolCall.status === 'success' && (
                <View className="mb-2">
                  <Text className="text-xs font-semibold text-gray-700 mb-1">
                    Result:
                  </Text>
                  <View
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
                  >
                    <Text className="text-xs text-gray-600 font-mono">
                      {typeof toolCall.result === 'string'
                        ? toolCall.result
                        : JSON.stringify(toolCall.result, null, 2)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Collapse indicator */}
              <View className="flex-row items-center justify-center mt-1">
                <Text className="text-xs text-gray-400">Tap to collapse</Text>
                <Ionicons
                  name="chevron-up"
                  size={14}
                  color="#9ca3af"
                  style={{ marginLeft: 4 }}
                />
              </View>
            </View>
          )}
        </View>
      </GlassView>
    </Pressable>
  );
}
