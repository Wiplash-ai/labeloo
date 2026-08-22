import test from "node:test";
import assert from "node:assert/strict";

test("extension sign-in completes through browser identity and PKCE without a device code", async () => {
  const stored = {};
  let authorizationRequest;
  const requests = [];
  const redirectUri = "https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/";
  globalThis.location = { protocol: "chrome-extension:", hostname: "abcdefghijklmnopabcdefghijklmnop" };
  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) { return Object.fromEntries(keys.map((key) => [key, stored[key]])); },
        async set(value) { Object.assign(stored, value); },
        async remove(key) { delete stored[key]; },
      },
    },
    runtime: { getManifest() { return {}; } },
    permissions: { async contains() { return true; }, async request() { return true; } },
    identity: {
      getRedirectURL() { return redirectUri; },
      async launchWebAuthFlow() {
        assert.ok(authorizationRequest);
        const callback = new URL(redirectUri);
        callback.searchParams.set("code", "c".repeat(43));
        callback.searchParams.set("state", authorizationRequest.state);
        return callback.toString();
      },
    },
  };
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    requests.push({ url, init });
    if (url.pathname.endsWith("/v1/auth/extension-authorizations")) {
      authorizationRequest = JSON.parse(init.body);
      assert.equal(authorizationRequest.redirectUri, redirectUri);
      assert.match(authorizationRequest.state, /^[A-Za-z0-9_-]{43}$/);
      assert.match(authorizationRequest.codeChallenge, /^[A-Za-z0-9_-]{43}$/);
      return Response.json({
        status: "waiting",
        authorizationId: "authorization-123",
        authorizationUrl: "https://auth.wiplash.ai/labeloo/extension/authorization-123?state=test",
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      }, { status: 201 });
    }
    if (url.pathname.endsWith("/v1/auth/extension-authorizations/authorization-123/exchange")) {
      const exchange = JSON.parse(init.body);
      assert.equal(exchange.code, "c".repeat(43));
      assert.equal(exchange.redirectUri, redirectUri);
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(exchange.codeVerifier));
      const expectedChallenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
      assert.equal(expectedChallenge, authorizationRequest.codeChallenge);
      return Response.json({
        status: "connected",
        credential: {
          type: "labeloo_session",
          accessToken: `loo_account_${"t".repeat(43)}`,
          expiresAt: "2026-09-21T12:00:00.000Z",
        },
        snapshot: {
          account: { id: "user-123", email: "labels@example.com", displayName: "Label Maker", expiresAt: "2026-09-21T12:00:00.000Z", mode: "bearer" },
          capabilities: { projectSync: true, googleDrive: true },
        },
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const { loadAccount, signIn } = await import(`../src/sync.js?auth-flow=${Date.now()}`);
  const connected = await signIn(await loadAccount());
  assert.equal(connected.user.email, "labels@example.com");
  assert.match(connected.credential, /^loo_account_/);
  assert.equal(requests.some(({ url }) => url.pathname.includes("device-authorizations")), false);
});
