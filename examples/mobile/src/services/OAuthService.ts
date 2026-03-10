// OAuth Service for React Native with Expo AuthSession
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Enable browser dismissal on redirect
WebBrowser.maybeCompleteAuthSession();

export interface OAuthConfig {
  baseUrl: string;
  authEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint: string;
  scopes: string[];
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
}

export interface ClientRegistration {
  clientId: string;
  clientSecret?: string;
}

const DEFAULT_CONFIG: OAuthConfig = {
  baseUrl: 'https://day.ai',
  authEndpoint: 'https://day.ai/api/oauth/authorize',
  tokenEndpoint: 'https://day.ai/api/oauth',
  registrationEndpoint: 'https://day.ai/api/oauth/register',
  scopes: ['read', 'write'],
};

/**
 * Register a new OAuth client dynamically (RFC 7591)
 */
export async function registerClient(
  redirectUri: string,
  config: OAuthConfig = DEFAULT_CONFIG,
  clientName: string = 'Day AI Mobile'
): Promise<ClientRegistration> {
  console.log('[OAuthService] Registering client with redirect URI:', redirectUri);

  const response = await fetch(config.registrationEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_name: clientName,
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Client registration failed: ${error}`);
  }

  const data = await response.json();
  console.log('[OAuthService] Client registered successfully');

  return {
    clientId: data.client_id,
    clientSecret: data.client_secret,
  };
}

/**
 * Start the OAuth authorization flow with Expo AuthSession
 */
export async function startAuthFlow(
  config: OAuthConfig = DEFAULT_CONFIG
): Promise<{ clientId: string; clientSecret?: string; refreshToken: string }> {
  try {
    // Check if AuthSession.startAsync is available (native only)
    if (typeof AuthSession.startAsync !== 'function') {
      throw new Error(
        'OAuth flow requires native app (iOS/Android). Web platform is not supported for OAuth.'
      );
    }

    // OAuth flow is only supported on native platforms (iOS/Android)
    if (Platform.OS === 'web') {
      throw new Error(
        'OAuth flow is not supported on web. Please use the iOS or Android app for OAuth authentication.'
      );
    }

    // Create redirect URI using expo-auth-session
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'dayai',
      path: 'auth',
    });

    console.log('[OAuthService] Redirect URI:', redirectUri);

    // Register OAuth client dynamically
    const client = await registerClient(redirectUri, config);

    // Generate PKCE values
    const codeVerifier = await generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    console.log('[OAuthService] Starting auth flow with client:', client.clientId);

    // Build authorization URL
    const authUrl = new URL(config.authEndpoint);
    authUrl.searchParams.set('client_id', client.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('scope', config.scopes.join(' '));

    // Open browser for authorization (native only)
    const result = await AuthSession.startAsync({
      authUrl: authUrl.toString(),
      returnUrl: redirectUri,
    });

    if (result.type !== 'success') {
      throw new Error(`Authorization failed: ${result.type}`);
    }

    const { params } = result;

    // Verify state
    if (params.state !== state) {
      throw new Error('State mismatch - possible CSRF attack');
    }

    if (params.error) {
      throw new Error(params.error_description || params.error);
    }

    if (!params.code) {
      throw new Error('No authorization code received');
    }

    console.log('[OAuthService] Authorization successful, exchanging code for tokens');

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: client.clientId,
        code: params.code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokens = await tokenResponse.json();

    console.log('[OAuthService] Tokens received successfully');

    return {
      clientId: client.clientId,
      clientSecret: client.clientSecret,
      refreshToken: tokens.refresh_token,
    };
  } catch (error) {
    console.error('[OAuthService] Auth flow failed:', error);
    throw error;
  }
}

/**
 * Generate PKCE code verifier
 */
async function generateCodeVerifier(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return base64UrlEncode(randomBytes);
}

/**
 * Generate PKCE code challenge from verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  return base64UrlEncode(base64ToArrayBuffer(hash));
}

/**
 * Generate random state parameter
 */
function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Base64 URL encoding (RFC 4648)
 */
function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
