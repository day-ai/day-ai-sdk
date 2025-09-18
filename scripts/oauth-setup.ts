#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import url from "node:url";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface OAuthClientResponse {
  client_id: string;
  client_secret: string;
  client_secret_expires_at: number;
  client_id_issued_at: number;
  redirect_uris: string[];
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

class OAuthSetup {
  private baseUrl: string;
  private integrationName: string;
  private redirectUri = "http://127.0.0.1:8080/callback";
  private server?: http.Server;

  constructor() {
    this.baseUrl = process.env.DAY_AI_BASE_URL || "https://day.ai";
    this.integrationName =
      process.env.INTEGRATION_NAME || "Day AI SDK Integration";

    if (
      !this.integrationName ||
      this.integrationName === "My Day AI Integration"
    ) {
      console.error("❌ Please set INTEGRATION_NAME in your .env file");
      process.exit(1);
    }
  }

  async run() {
    console.log("🚀 Starting Day AI OAuth setup...\n");
    console.log(`Integration Name: ${this.integrationName}`);
    console.log(`Day AI URL: ${this.baseUrl}\n`);

    try {
      // Step 1: Register OAuth client
      console.log("📝 Step 1: Registering OAuth client...");
      const clientData = await this.registerClient();
      console.log(`✅ Client registered with ID: ${clientData.client_id}\n`);

      // Step 2: Generate authorization URL and start callback server
      console.log("🔐 Step 2: Starting authorization flow...");
      const state = randomBytes(16).toString("hex");
      const authUrl = this.buildAuthorizationUrl(clientData.client_id, state);

      console.log(
        `🌐 Please visit the following URL to authorize the integration:\n`
      );
      console.log(`${authUrl}\n`);
      console.log("⏳ Waiting for authorization...\n");

      // Step 3: Start callback server and wait for code
      const code = await this.waitForAuthorizationCode(state);
      console.log("✅ Authorization code received!\n");

      // Step 4: Exchange code for tokens
      console.log("🎟️  Step 4: Exchanging code for tokens...");
      const tokens = await this.exchangeCodeForTokens(clientData, code);
      console.log("✅ Tokens received!\n");

      // Step 5: Update .env file
      console.log("💾 Step 5: Updating .env file...");
      this.updateEnvFile(clientData, tokens);
      console.log("✅ .env file updated!\n");

      console.log("🎉 OAuth setup complete! You can now use the Day AI SDK.");
    } catch (error) {
      console.error(
        "❌ Setup failed:",
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  }

  private async registerClient(): Promise<OAuthClientResponse> {
    const payload = {
      redirect_uris: [this.redirectUri],
      client_name: this.integrationName,
      client_uri: "https://github.com/day-ai/day-ai-sdk",
      scope: "assistant:*:use native_organization:write native_contact:write",
    };

    const response = await fetch(`${this.baseUrl}/api/oauth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to register client: ${response.status} ${response.statusText}`
      );
    }

    return (await response.json()) as OAuthClientResponse;
  }

  private buildAuthorizationUrl(clientId: string, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.redirectUri,
      state: state,
      response_type: "code",
    });

    return `${this.baseUrl}/integrations/authorize?${params.toString()}`;
  }

  private async waitForAuthorizationCode(
    expectedState: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        if (!req.url) return;

        const parsedUrl = url.parse(req.url, true);

        if (parsedUrl.pathname === "/callback") {
          const { code, state, error } = parsedUrl.query;

          // Send response to browser
          res.writeHead(200, { "Content-Type": "text/html" });
          if (error) {
            res.end(`
              <html>
                <body>
                  <h2>❌ Authorization Failed</h2>
                  <p>Error: ${error}</p>
                  <p>You can close this window and check your terminal.</p>
                </body>
              </html>
            `);
          } else if (code) {
            res.end(`
              <html>
                <body>
                  <h2>✅ Authorization Successful!</h2>
                  <p>You can close this window and return to your terminal.</p>
                </body>
              </html>
            `);
          }

          // Handle the response
          if (error) {
            this.server?.close();
            reject(new Error(`Authorization failed: ${error}`));
          } else if (!code) {
            this.server?.close();
            reject(new Error("No authorization code received"));
          } else if (state !== expectedState) {
            this.server?.close();
            reject(new Error("Invalid state parameter - possible CSRF attack"));
          } else {
            this.server?.close();
            resolve(code as string);
          }
        }
      });

      this.server.listen(8080, "127.0.0.1", () => {
        console.log("🔧 Callback server started on http://127.0.0.1:8080");
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        this.server?.close();
        reject(new Error("Authorization timeout - please try again"));
      }, 300000);
    });
  }

  private async exchangeCodeForTokens(
    clientData: OAuthClientResponse,
    code: string
  ): Promise<TokenResponse> {
    const payload = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientData.client_id,
      client_secret: clientData.client_secret,
      code: code,
    });

    const response = await fetch(`${this.baseUrl}/api/oauth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to exchange code for tokens: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    return (await response.json()) as TokenResponse;
  }

  private updateEnvFile(
    clientData: OAuthClientResponse,
    tokens: TokenResponse
  ) {
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";

    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }

    // Update or add the OAuth credentials
    const updates = {
      CLIENT_ID: clientData.client_id,
      CLIENT_SECRET: clientData.client_secret,
      REFRESH_TOKEN: tokens.refresh_token,
    };

    let newContent = envContent;

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (newContent.match(regex)) {
        newContent = newContent.replace(regex, `${key}=${value}`);
      } else {
        newContent += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(envPath, newContent.trim() + "\n");
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new OAuthSetup();
  setup.run().catch(console.error);
}

export default OAuthSetup;
