// Unit tests for the PKCE helper. No network or credentials: `yarn test:unit`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAuthorizeUrl, createPkcePair, pkceChallenge } from "../../src/pkce";

// RFC 7636, Appendix B.
const RFC_VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const RFC_CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

test("challenge matches the RFC 7636 Appendix B test vector", () => {
  assert.equal(pkceChallenge(RFC_VERIFIER), RFC_CHALLENGE);
});

test("verifier is 43 chars of the unreserved set and the challenge is S256 of it", () => {
  for (let i = 0; i < 200; i++) {
    const { verifier, challenge } = createPkcePair();
    assert.equal(verifier.length, 43);
    assert.match(verifier, /^[A-Za-z0-9\-._~]{43,128}$/);
    assert.ok(!verifier.includes("="), "no padding");
    assert.match(challenge, /^[A-Za-z0-9\-_]{43}$/);
    assert.equal(challenge, pkceChallenge(verifier));
  }
});

test("every pair is new", () => {
  const seen = new Set(Array.from({ length: 1000 }, () => createPkcePair().verifier));
  assert.equal(seen.size, 1000);
});

test("authorize URL carries code_challenge and code_challenge_method=S256", () => {
  const { verifier, challenge } = createPkcePair();
  const url = new URL(
    buildAuthorizeUrl("https://day.ai/", {
      clientId: "client-123",
      redirectUri: "http://127.0.0.1:8080/callback",
      state: "abc",
      codeChallenge: challenge,
    })
  );
  assert.equal(url.origin + url.pathname, "https://day.ai/integrations/authorize");
  assert.equal(url.searchParams.get("code_challenge"), challenge);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("client_id"), "client-123");
  assert.equal(url.searchParams.get("redirect_uri"), "http://127.0.0.1:8080/callback");
  assert.equal(url.searchParams.get("state"), "abc");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.ok(!url.toString().includes(verifier), "the verifier never goes on the authorize URL");
});
