/**
 * Browser login for `day-ai login`: the same flow as scripts/oauth-setup.ts
 * (dynamic client registration → /integrations/authorize → code exchange),
 * without the .env and INTEGRATION_NAME requirements.
 *
 *   1. Listen on 127.0.0.1 (a free port unless --port), callback path /callback
 *   2. Register an OAuth client for that redirect URI (scope assistant:*:use)
 *   3. Open the browser at the consent screen, where the user picks the
 *      workspace and assistant this login acts as
 *   4. Verify `state`, exchange the code for tokens
 */
import * as http from "node:http";
import * as os from "node:os";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";
import { info } from "./output";

export interface LoginOptions {
  baseUrl: string;
  clientName: string;
  port?: number;
  openBrowser: boolean;
  timeoutMs?: number;
}

export interface LoginResult {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  /** Epoch seconds. */
  accessTokenExpiresAt: number;
  refreshToken: string;
}

interface RegisteredClient {
  client_id: string;
  client_secret: string;
}

interface Tokens {
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

export function defaultClientName(): string {
  return `day-ai CLI (${os.hostname().replace(/\.local$/, "")})`;
}

export async function login(opts: LoginOptions): Promise<LoginResult> {
  const state = randomBytes(16).toString("hex");
  const callback = startCallbackServer(state, opts.port ?? 0, opts.timeoutMs ?? 5 * 60_000);
  const port = await callback.port;
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  try {
    const registered = await registerClient(opts.baseUrl, opts.clientName, redirectUri);

    const authUrl = `${opts.baseUrl}/integrations/authorize?${new URLSearchParams({
      client_id: registered.client_id,
      redirect_uri: redirectUri,
      state,
      response_type: "code",
    })}`;

    info(`Sign in to Day AI and choose the workspace and assistant for this login:\n\n  ${authUrl}\n`);
    if (opts.openBrowser) openInBrowser(authUrl);
    info("Waiting for the browser (5 minutes)…");

    const code = await callback.code;
    const tokens = await exchangeCode(opts.baseUrl, registered, code, redirectUri);
    return {
      clientId: registered.client_id,
      clientSecret: registered.client_secret,
      accessToken: tokens.access_token,
      accessTokenExpiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      refreshToken: tokens.refresh_token,
    };
  } finally {
    callback.close();
  }
}

async function registerClient(baseUrl: string, clientName: string, redirectUri: string): Promise<RegisteredClient> {
  const res = await fetch(`${baseUrl}/api/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      redirect_uris: [redirectUri],
      client_name: clientName,
      client_uri: "https://github.com/day-ai/day-ai-sdk",
      scope: "assistant:*:use",
    }),
  });
  if (!res.ok) throw new Error(`Client registration failed: HTTP ${res.status} ${res.statusText}\n${await res.text()}`);
  return (await res.json()) as RegisteredClient;
}

async function exchangeCode(baseUrl: string, client: RegisteredClient, code: string, redirectUri: string): Promise<Tokens> {
  const res = await fetch(`${baseUrl}/api/oauth`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: client.client_id,
      client_secret: client.client_secret,
      code,
      // Must repeat the authorization request's redirect_uri exactly (RFC 6749 §4.1.3).
      redirect_uri: redirectUri,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Code exchange failed: HTTP ${res.status} ${res.statusText}\n${await res.text()}`);
  const tokens = (await res.json()) as Tokens;
  if (!tokens.refresh_token) throw new Error("Day AI returned no refresh token; try `day-ai login` again.");
  return tokens;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function page(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>` +
    `<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;line-height:1.5">` +
    `<h2>${title}</h2><p>${body}</p></body></html>`;
}

function startCallbackServer(expectedState: string, port: number, timeoutMs: number) {
  let resolveCode!: (code: string) => void;
  let rejectCode!: (err: Error) => void;
  const code = new Promise<string>((res, rej) => {
    resolveCode = res;
    rejectCode = rej;
  });

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname !== "/callback") {
      res.writeHead(404).end();
      return;
    }
    const error = url.searchParams.get("error");
    const got = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    if (error) {
      res.end(page("Authorization failed", `${escapeHtml(error)}. You can close this tab and check your terminal.`));
      rejectCode(new Error(`Authorization failed: ${error}`));
    } else if (!got) {
      res.end(page("Authorization failed", "No authorization code was returned."));
      rejectCode(new Error("No authorization code received"));
    } else if (state !== expectedState) {
      res.end(page("Authorization failed", "The state parameter did not match. Run day-ai login again."));
      rejectCode(new Error("State mismatch on the OAuth callback; run `day-ai login` again"));
    } else {
      res.end(page("You're signed in", "You can close this tab and return to your terminal."));
      resolveCode(got);
    }
  });

  const portPromise = new Promise<number>((res, rej) => {
    server.once("error", (e: NodeJS.ErrnoException) =>
      rej(e.code === "EADDRINUSE" ? new Error(`Port ${port} is in use; pass a different --port or omit it`) : e)
    );
    server.listen(port, "127.0.0.1", () => res((server.address() as AddressInfo).port));
  });

  const timer = setTimeout(() => rejectCode(new Error("Timed out waiting for the browser (5 minutes); run `day-ai login` again")), timeoutMs);
  timer.unref();

  return {
    port: portPromise,
    code,
    close: () => {
      clearTimeout(timer);
      server.close();
      server.closeAllConnections?.();
    },
  };
}

function openInBrowser(url: string): void {
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", '""', url.replace(/&/g, "^&")]]
        : ["xdg-open", [url]];
  try {
    const child = spawn(cmd, args as string[], { stdio: "ignore", detached: true });
    child.on("error", () => info("(Couldn't open a browser; open the URL above yourself.)"));
    child.unref();
  } catch {
    info("(Couldn't open a browser; open the URL above yourself.)");
  }
}
