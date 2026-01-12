import { shell } from 'electron'
import crypto from 'crypto'
import http from 'http'

export interface OAuthConfig {
  baseUrl: string
  authEndpoint: string
  tokenEndpoint: string
  registrationEndpoint: string
  scopes: string[]
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType: string
}

export interface ClientRegistration {
  clientId: string
  clientSecret?: string
}

// Generate a random string for PKCE code_verifier
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

// Generate code_challenge from code_verifier using S256
function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest()
  return hash.toString('base64url')
}

// Generate a random state parameter
function generateState(): string {
  return crypto.randomBytes(16).toString('hex')
}

// Fixed port for OAuth callback
export const OAUTH_CALLBACK_PORT = 31338
export const OAUTH_REDIRECT_URI = `http://127.0.0.1:${OAUTH_CALLBACK_PORT}/callback`

/**
 * Register a new OAuth client dynamically (RFC 7591)
 */
export async function registerClient(
  registrationEndpoint: string,
  redirectUri: string,
  clientName: string = 'Day AI Demo'
): Promise<ClientRegistration> {
  const response = await fetch(registrationEndpoint, {
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
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Client registration failed: ${error}`)
  }

  const data = await response.json()
  return {
    clientId: data.client_id,
    clientSecret: data.client_secret,
  }
}

/**
 * Start the OAuth authorization flow
 */
export async function startAuthFlow(config: OAuthConfig, clientId: string): Promise<OAuthTokens> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = generateState()

  const port = OAUTH_CALLBACK_PORT
  const redirectUri = OAUTH_REDIRECT_URI

  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | null = null
    let server: http.Server | null = null

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (server) {
        server.close()
        server = null
      }
    }

    // Create callback server
    server = http.createServer(async (req, res) => {
      if (!req.url?.startsWith('/callback')) {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const url = new URL(req.url, `http://127.0.0.1:${port}`)
      const code = url.searchParams.get('code')
      const returnedState = url.searchParams.get('state')
      const error = url.searchParams.get('error')
      const errorDescription = url.searchParams.get('error_description')

      res.writeHead(200, { 'Content-Type': 'text/html' })

      const errorPage = (message: string) => `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Day AI Demo - Authorization Failed</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #e4e4e7;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
              }
              .container {
                text-align: center;
                padding: 3rem;
                background: rgba(30, 30, 46, 0.8);
                border-radius: 16px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                max-width: 400px;
              }
              .icon {
                width: 64px;
                height: 64px;
                background: #ef4444;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem;
              }
              .icon svg { width: 32px; height: 32px; color: white; }
              h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.75rem; }
              p { color: #a1a1aa; font-size: 0.95rem; line-height: 1.5; }
              .hint { margin-top: 1.5rem; font-size: 0.8rem; color: #71717a; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">
                <svg fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1>Authorization Failed</h1>
              <p>${message}</p>
              <p class="hint">You can close this tab and try again.</p>
            </div>
          </body>
        </html>
      `

      if (error) {
        res.end(errorPage(errorDescription || error))
        cleanup()
        reject(new Error(errorDescription || error))
        return
      }

      if (!code) {
        res.end(errorPage('No authorization code received'))
        cleanup()
        reject(new Error('No authorization code received'))
        return
      }

      if (returnedState !== state) {
        res.end(errorPage('State mismatch - possible security issue'))
        cleanup()
        reject(new Error('State mismatch - possible CSRF attack'))
        return
      }

      // Success - exchange code for tokens
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Day AI Demo - Authorization Complete</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #e4e4e7;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
              }
              .container {
                text-align: center;
                padding: 3rem;
                background: rgba(30, 30, 46, 0.8);
                border-radius: 16px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                max-width: 400px;
              }
              .icon {
                width: 64px;
                height: 64px;
                background: #22c55e;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem;
              }
              .icon svg { width: 32px; height: 32px; color: white; }
              h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.75rem; }
              p { color: #a1a1aa; font-size: 0.95rem; line-height: 1.5; }
              .hint { margin-top: 1.5rem; font-size: 0.8rem; color: #71717a; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">
                <svg fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1>Connected to Day.ai</h1>
              <p>Authorization was successful. You can now use Day.ai tools.</p>
              <p class="hint">You can close this tab and return to the app.</p>
            </div>
          </body>
        </html>
      `)

      try {
        const tokens = await exchangeCodeForTokens(
          config.tokenEndpoint,
          code,
          clientId,
          redirectUri,
          codeVerifier
        )
        cleanup()
        resolve(tokens)
      } catch (err) {
        cleanup()
        reject(err)
      }
    })

    server.listen(port, '127.0.0.1', () => {
      console.log(`[OAuth] Callback server listening on port ${port}`)

      // Build authorization URL
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: config.scopes.join(' '),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      })

      const authUrl = `${config.authEndpoint}?${params.toString()}`
      shell.openExternal(authUrl)
    })

    server.on('error', (err) => {
      cleanup()
      reject(err)
    })

    // Set a timeout
    timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('OAuth flow timed out'))
    }, 5 * 60 * 1000)
  })
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(
  tokenEndpoint: string,
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string
): Promise<OAuthTokens> {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type || 'Bearer',
  }
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(
  tokenEndpoint: string,
  clientId: string,
  refreshToken: string
): Promise<OAuthTokens> {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    }).toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
    tokenType: data.token_type || 'Bearer',
  }
}

/**
 * Revoke an access token (logout)
 */
export async function revokeToken(
  revocationEndpoint: string,
  clientId: string,
  token: string,
  tokenTypeHint: 'access_token' | 'refresh_token' = 'access_token'
): Promise<void> {
  const response = await fetch(revocationEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      token,
      token_type_hint: tokenTypeHint,
    }).toString(),
  })

  if (!response.ok && response.status !== 200) {
    const error = await response.text()
    throw new Error(`Token revocation failed: ${error}`)
  }
}
