// Environment configuration
import Constants from 'expo-constants';

interface EnvConfig {
  ANTHROPIC_API_KEY: string;
  PROXY_URL: string;
}

// Default values
const defaultConfig: EnvConfig = {
  ANTHROPIC_API_KEY: '',
  PROXY_URL: 'http://localhost:3001',
};

// Get config from environment or expo config
export const ENV: EnvConfig = {
  ANTHROPIC_API_KEY:
    process.env.ANTHROPIC_API_KEY ||
    Constants.expoConfig?.extra?.anthropicApiKey ||
    defaultConfig.ANTHROPIC_API_KEY,
  PROXY_URL:
    process.env.PROXY_URL ||
    Constants.expoConfig?.extra?.proxyUrl ||
    defaultConfig.PROXY_URL,
};
