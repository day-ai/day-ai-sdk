// SettingsSheet - configuration modal for API keys and model selection
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from './GlassView';
import { LinearGradient } from 'expo-linear-gradient';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  currentApiKey: string;
  dayAIConnected: boolean;
  onSaveSettings: (apiKey: string, model: string) => void;
  onClearChat: () => void;
  onConnectDayAI: (credentials: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onDisconnectDayAI: () => Promise<void>;
}

export function SettingsSheet({
  visible,
  onClose,
  currentApiKey,
  dayAIConnected,
  onSaveSettings,
  onClearChat,
  onConnectDayAI,
  onDisconnectDayAI,
}: SettingsSheetProps) {
  const [apiKey, setApiKey] = useState(currentApiKey);
  const [selectedModel, setSelectedModel] = useState<string>(
    'claude-sonnet-4-20250514'
  );
  const [showApiKey, setShowApiKey] = useState(false);

  // Day AI connection state
  const [dayAIClientId, setDayAIClientId] = useState('');
  const [dayAIClientSecret, setDayAIClientSecret] = useState('');
  const [dayAIRefreshToken, setDayAIRefreshToken] = useState('');
  const [dayAIConnecting, setDayAIConnecting] = useState(false);
  const [dayAIError, setDayAIError] = useState<string | null>(null);

  const handleSave = () => {
    if (apiKey.trim()) {
      onSaveSettings(apiKey.trim(), selectedModel);
      onClose();
    }
  };

  const handleConnectDayAI = async () => {
    if (!dayAIClientId.trim() || !dayAIClientSecret.trim() || !dayAIRefreshToken.trim()) {
      setDayAIError('Please fill in all Day AI credentials');
      return;
    }

    setDayAIConnecting(true);
    setDayAIError(null);

    const result = await onConnectDayAI({
      clientId: dayAIClientId.trim(),
      clientSecret: dayAIClientSecret.trim(),
      refreshToken: dayAIRefreshToken.trim(),
    });

    setDayAIConnecting(false);

    if (result.success) {
      // Clear fields on success
      setDayAIClientId('');
      setDayAIClientSecret('');
      setDayAIRefreshToken('');
    } else {
      setDayAIError(result.error || 'Connection failed');
    }
  };

  const handleDisconnectDayAI = async () => {
    await onDisconnectDayAI();
    setDayAIError(null);
  };

  const models = [
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Sonnet 4.5',
      description: 'Fast and intelligent',
    },
    {
      id: 'claude-opus-4-20250514',
      name: 'Opus 4.5',
      description: 'Most powerful',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1">
        {/* Background gradient */}
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
          >
            {/* Header */}
            <View className="px-4 pt-2 pb-4 flex-row items-center justify-between">
              <Text className="text-2xl font-bold text-gray-800">Settings</Text>
              <Pressable
                onPress={onClose}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{
                  backgroundColor: 'rgba(74, 154, 154, 0.1)',
                }}
              >
                <Ionicons name="close" size={24} color="#4a9a9a" />
              </Pressable>
            </View>

            <ScrollView className="flex-1 px-4">
              {/* API Key Section */}
              <GlassView
                intensity={60}
                tint="light"
                className="rounded-2xl overflow-hidden mb-4"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                <View className="p-4">
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    Anthropic API Key
                  </Text>
                  <Text className="text-sm text-gray-600 mb-3">
                    Get your API key from console.anthropic.com
                  </Text>

                  <View className="flex-row items-center">
                    <TextInput
                      className="flex-1 px-4 py-3 rounded-xl bg-white/50 text-gray-800"
                      value={apiKey}
                      onChangeText={setApiKey}
                      placeholder="sk-ant-..."
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showApiKey}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable
                      onPress={() => setShowApiKey(!showApiKey)}
                      className="ml-2 p-3 rounded-xl"
                      style={{
                        backgroundColor: 'rgba(74, 154, 154, 0.1)',
                      }}
                    >
                      <Ionicons
                        name={showApiKey ? 'eye-off' : 'eye'}
                        size={20}
                        color="#4a9a9a"
                      />
                    </Pressable>
                  </View>

                  {currentApiKey && (
                    <View className="mt-2 flex-row items-center">
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#10b981"
                      />
                      <Text className="text-sm text-green-600 ml-1">
                        API key configured
                      </Text>
                    </View>
                  )}
                </View>
              </GlassView>

              {/* Model Selection */}
              <GlassView
                intensity={60}
                tint="light"
                className="rounded-2xl overflow-hidden mb-4"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                <View className="p-4">
                  <Text className="text-lg font-semibold text-gray-800 mb-3">
                    Model Selection
                  </Text>

                  {models.map((model) => (
                    <Pressable
                      key={model.id}
                      onPress={() => setSelectedModel(model.id)}
                      className="flex-row items-center py-3 px-4 rounded-xl mb-2"
                      style={{
                        backgroundColor:
                          selectedModel === model.id
                            ? 'rgba(74, 154, 154, 0.15)'
                            : 'rgba(255, 255, 255, 0.3)',
                      }}
                    >
                      <View
                        className="w-5 h-5 rounded-full border-2 items-center justify-center mr-3"
                        style={{
                          borderColor:
                            selectedModel === model.id ? '#4a9a9a' : '#d1d5db',
                        }}
                      >
                        {selectedModel === model.id && (
                          <View className="w-3 h-3 rounded-full bg-primary-400" />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-medium text-gray-800">
                          {model.name}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          {model.description}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </GlassView>

              {/* Day AI Connection */}
              <GlassView
                intensity={60}
                tint="light"
                className="rounded-2xl overflow-hidden mb-4"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                <View className="p-4">
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    Day AI Connection
                  </Text>
                  <Text className="text-sm text-gray-600 mb-3">
                    Connect to Day AI to access CRM data via MCP tools
                  </Text>

                  {dayAIConnected ? (
                    // Connected state
                    <View>
                      <View className="flex-row items-center mb-3">
                        <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                        <Text className="text-base text-green-700 font-medium">
                          Connected to Day AI
                        </Text>
                      </View>
                      <Pressable
                        onPress={handleDisconnectDayAI}
                        className="flex-row items-center justify-center py-3 px-4 rounded-xl"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        }}
                      >
                        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                        <Text className="text-red-600 ml-2 font-medium">
                          Disconnect
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    // Disconnected state
                    <View>
                      <Text className="text-xs text-gray-500 mb-2">
                        Run yarn oauth:setup in the SDK root to get credentials
                      </Text>

                      <TextInput
                        className="px-4 py-3 rounded-xl bg-white/50 text-gray-800 mb-2"
                        value={dayAIClientId}
                        onChangeText={setDayAIClientId}
                        placeholder="Client ID"
                        placeholderTextColor="#9ca3af"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />

                      <TextInput
                        className="px-4 py-3 rounded-xl bg-white/50 text-gray-800 mb-2"
                        value={dayAIClientSecret}
                        onChangeText={setDayAIClientSecret}
                        placeholder="Client Secret"
                        placeholderTextColor="#9ca3af"
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                      />

                      <TextInput
                        className="px-4 py-3 rounded-xl bg-white/50 text-gray-800 mb-3"
                        value={dayAIRefreshToken}
                        onChangeText={setDayAIRefreshToken}
                        placeholder="Refresh Token"
                        placeholderTextColor="#9ca3af"
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                      />

                      {dayAIError && (
                        <View className="mb-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                          <Text className="text-sm text-red-600">{dayAIError}</Text>
                        </View>
                      )}

                      <Pressable
                        onPress={handleConnectDayAI}
                        disabled={dayAIConnecting}
                        className="flex-row items-center justify-center py-3 px-4 rounded-xl"
                        style={{
                          backgroundColor: 'rgba(74, 154, 154, 0.15)',
                          opacity: dayAIConnecting ? 0.5 : 1,
                        }}
                      >
                        <Ionicons
                          name={dayAIConnecting ? 'hourglass-outline' : 'link-outline'}
                          size={20}
                          color="#4a9a9a"
                        />
                        <Text className="text-primary-700 ml-2 font-medium">
                          {dayAIConnecting ? 'Connecting...' : 'Connect'}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </GlassView>

              {/* Actions */}
              <GlassView
                intensity={60}
                tint="light"
                className="rounded-2xl overflow-hidden mb-4"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                <View className="p-4">
                  <Pressable
                    onPress={onClearChat}
                    className="flex-row items-center justify-center py-3 px-4 rounded-xl"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                    <Text className="text-red-600 ml-2 font-medium">
                      Clear Chat History
                    </Text>
                  </Pressable>
                </View>
              </GlassView>
            </ScrollView>

            {/* Save Button */}
            <View className="px-4 pb-4 pt-2">
              <Pressable
                onPress={handleSave}
                disabled={!apiKey.trim()}
                className="rounded-2xl overflow-hidden"
                style={{
                  opacity: apiKey.trim() ? 1 : 0.5,
                }}
              >
                <GlassView
                  intensity={60}
                  tint="light"
                  style={{
                    backgroundColor: 'rgba(74, 154, 154, 0.3)',
                    borderWidth: 1,
                    borderColor: 'rgba(74, 154, 154, 0.5)',
                  }}
                >
                  <View className="py-4 items-center">
                    <Text className="text-lg font-semibold text-primary-800">
                      Save Settings
                    </Text>
                  </View>
                </GlassView>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
