// ChatScreen - main chat interface
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView } from './GlassView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../hooks';
import { MessageBubble } from './MessageBubble';
import { SettingsSheet } from './SettingsSheet';
import { ToolCallDisplay } from './ToolCallDisplay';

export function ChatScreen() {
  const {
    chatState,
    messages,
    currentResponse,
    currentToolCalls,
    error,
    apiKey,
    dayAIConnected,
    sendMessage,
    cancelStreaming,
    clearMessages,
    updateSettings,
    connectDayAI,
    disconnectDayAI,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 || currentResponse || currentToolCalls?.length) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, currentResponse, currentToolCalls?.length]);

  // Show settings if no API key on mount
  useEffect(() => {
    if (!apiKey) {
      setTimeout(() => setSettingsVisible(true), 500);
    }
  }, [apiKey]);

  const handleSend = () => {
    if (inputText.trim() && chatState === 'idle') {
      sendMessage(inputText.trim());
      setInputText('');
      Keyboard.dismiss();
    }
  };

  const handleClearChat = () => {
    clearMessages();
    setSettingsVisible(false);
  };

  const isInputDisabled = chatState !== 'idle' || !apiKey;

  return (
    <View className="flex-1">
      {/* Background gradient - liquid glass effect */}
      <LinearGradient
        colors={['#f0f9f9', '#e8f4f4', '#d9f0f0', '#e8f4f4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View className="px-4 pt-2 pb-4 flex-row items-center justify-between">
            <GlassView
              intensity={60}
              tint="light"
              className="flex-1 rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <View className="px-4 py-3 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-primary-400/30 items-center justify-center mr-3">
                    <Ionicons name="sparkles" size={20} color="#4a9a9a" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-800">
                      Day AI Chat
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-sm text-gray-500">
                        {!apiKey
                          ? 'Configure API key'
                          : chatState === 'idle'
                          ? 'Ready'
                          : chatState === 'thinking'
                          ? 'Thinking...'
                          : chatState === 'streaming'
                          ? 'Responding...'
                          : 'Sending...'}
                      </Text>
                      {dayAIConnected && (
                        <View className="ml-2 flex-row items-center">
                          <View className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                          <Text className="text-xs text-green-600">Day AI</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() => setSettingsVisible(true)}
                  className="p-2 rounded-full"
                  style={{
                    backgroundColor: 'rgba(74, 154, 154, 0.1)',
                  }}
                >
                  <Ionicons name="settings-outline" size={20} color="#4a9a9a" />
                </Pressable>
              </View>
            </GlassView>
          </View>

          {/* Messages area */}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 px-4"
            contentContainerStyle={{
              paddingBottom: 20,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View className="flex-1 items-center justify-center py-20">
                <View className="w-20 h-20 rounded-full bg-primary-400/20 items-center justify-center mb-4">
                  <Ionicons name="chatbubbles-outline" size={40} color="#4a9a9a" />
                </View>
                <Text className="text-lg font-medium text-gray-700 mb-2">
                  Start a conversation
                </Text>
                <Text className="text-gray-500 text-center px-10">
                  {apiKey
                    ? 'Type a message below to chat with Day AI'
                    : 'Configure your API key in Settings to begin'}
                </Text>
              </View>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}

                {/* Current tool calls during streaming */}
                {currentToolCalls && currentToolCalls.length > 0 && (
                  <View className="self-start mb-3 max-w-[85%]">
                    <Text className="text-xs font-semibold text-gray-600 mb-2 px-2">
                      Using tools...
                    </Text>
                    {currentToolCalls.map((toolCall) => (
                      <ToolCallDisplay key={toolCall.id} toolCall={toolCall} />
                    ))}
                  </View>
                )}

                {/* Streaming response */}
                {currentResponse && (
                  <View className="self-start mb-3 max-w-[85%]">
                    <GlassView
                      intensity={40}
                      tint="light"
                      className="rounded-2xl overflow-hidden"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.6)',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.8)',
                      }}
                    >
                      <View className="px-4 py-3">
                        <Text className="text-base text-gray-800">
                          {currentResponse}
                          <Text className="text-primary-400">▋</Text>
                        </Text>
                      </View>
                    </GlassView>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Error display */}
          {error && (
            <View className="mx-4 mb-2">
              <GlassView
                intensity={60}
                tint="light"
                className="rounded-xl overflow-hidden"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
              >
                <View className="px-4 py-3 flex-row items-center">
                  <Ionicons name="alert-circle" size={20} color="#dc2626" />
                  <Text className="text-red-600 ml-2 flex-1">{error}</Text>
                </View>
              </GlassView>
            </View>
          )}

          {/* Input area */}
          <View className="px-4 pb-4 pt-2">
            <GlassView
              intensity={60}
              tint="light"
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <View className="flex-row items-center px-4 py-2">
                <TextInput
                  className="flex-1 text-base text-gray-800 py-2"
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={
                    !apiKey
                      ? 'Configure API key first...'
                      : 'Type a message...'
                  }
                  placeholderTextColor="#9ca3af"
                  multiline
                  maxLength={2000}
                  editable={!isInputDisabled}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                />

                {chatState !== 'idle' ? (
                  <Pressable
                    onPress={cancelStreaming}
                    className="ml-2 w-10 h-10 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    }}
                  >
                    <Ionicons name="stop" size={20} color="#dc2626" />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleSend}
                    disabled={isInputDisabled || !inputText.trim()}
                    className="ml-2 w-10 h-10 rounded-full items-center justify-center"
                    style={{
                      backgroundColor:
                        !isInputDisabled && inputText.trim()
                          ? 'rgba(74, 154, 154, 0.2)'
                          : 'rgba(156, 163, 175, 0.2)',
                    }}
                  >
                    <Ionicons
                      name="send"
                      size={20}
                      color={
                        !isInputDisabled && inputText.trim()
                          ? '#4a9a9a'
                          : '#9ca3af'
                      }
                    />
                  </Pressable>
                )}
              </View>
            </GlassView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Settings Sheet */}
      <SettingsSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        currentApiKey={apiKey}
        dayAIConnected={dayAIConnected}
        onSaveSettings={updateSettings}
        onClearChat={handleClearChat}
        onConnectDayAI={connectDayAI}
        onDisconnectDayAI={disconnectDayAI}
      />
    </View>
  );
}
