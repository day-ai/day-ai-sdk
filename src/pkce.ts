/**
 * PKCE (RFC 7636, S256) for the Day AI OAuth login.
 *
 * Day AI requires PKCE on every authorization-code login:
 *   1. Make a fresh pair with createPkcePair() for each login.
 *   2. Send `code_challenge` + `code_challenge_method=S256` on /integrations/authorize
 *      (buildAuthorizeUrl does this).
 *   3. Send `code_verifier` with the `grant_type=authorization_code` exchange.
 * Keep the verifier in memory for that one login only: don't log it, store it or reuse it.
 * Refresh-token requests don't change.
 */
import { createHash, randomBytes } from "node:crypto";

export interface PkcePair {
  /** Secret, sent only on the code exchange. 43 chars of [A-Za-z0-9-_]. */
  verifier: string;
  /** base64url(SHA-256(verifier)), sent on the authorize URL. */
  challenge: string;
}

/** base64url(SHA-256(verifier)), no padding. */
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

/** A new verifier (32 CSPRNG bytes, base64url, 43 chars) and its S256 challenge. */
export function createPkcePair(): PkcePair {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: pkceChallenge(verifier) };
}

export interface AuthorizeUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
}

/** The Day AI consent-screen URL, with PKCE (S256). */
export function buildAuthorizeUrl(baseUrl: string, p: AuthorizeUrlParams): string {
  const params = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    state: p.state,
    response_type: "code",
    code_challenge: p.codeChallenge,
    code_challenge_method: "S256",
  });
  if (p.scope) params.set("scope", p.scope);
  return `${baseUrl.replace(/\/+$/, "")}/integrations/authorize?${params}`;
}
