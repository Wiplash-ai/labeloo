import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { accountServicePermissions, normalizeServiceBase } from "../src/sync.js";

test("account service URLs require HTTPS outside loopback", () => {
  assert.equal(normalizeServiceBase("https://auth.wiplash.ai/labeloo/"), "https://auth.wiplash.ai/labeloo");
  assert.equal(normalizeServiceBase("http://127.0.0.1:3040/labeloo"), "http://127.0.0.1:3040/labeloo");
  assert.throws(() => normalizeServiceBase("http://auth.wiplash.ai/labeloo"), /HTTPS/);
  assert.throws(() => normalizeServiceBase("https://user:secret@auth.wiplash.ai/labeloo"), /invalid/);
});

test("account permissions keep Firefox data consent out of Chromium payloads", () => {
  const firefoxManifest = {
    browser_specific_settings: {
      gecko: {
        data_collection_permissions: {
          optional: ["authenticationInfo", "personallyIdentifyingInfo"],
        },
      },
    },
  };

  assert.deepEqual(
    accountServicePermissions("https://auth.wiplash.ai/labeloo", {
      protocol: "chrome-extension:",
      manifest: firefoxManifest,
    }),
    { origins: ["https://auth.wiplash.ai/*"] },
  );
  assert.deepEqual(
    accountServicePermissions("https://auth.wiplash.ai/labeloo", {
      protocol: "moz-extension:",
      manifest: firefoxManifest,
    }),
    {
      origins: ["https://auth.wiplash.ai/*"],
      data_collection: ["authenticationInfo", "personallyIdentifyingInfo"],
    },
  );
});

test("Wiplash identity, Drive selection, and project sync remain separate client actions", async () => {
  const source = await readFile(new URL("../src/sync.js", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(source, /\/v1\/auth\/device-authorizations/);
  assert.match(source, /\/v1\/auth\/extension-authorizations/);
  assert.match(source, /launchWebAuthFlow/);
  assert.match(source, /error\?\.status === 404 \|\| error\?\.code === "extension_auth_unavailable"/);
  assert.match(source, /\/v1\/google-drive\/authorizations/);
  assert.match(source, /assertNoProviderCredentials/);
  assert.match(app, /account\.syncEnabled && account\.capabilities\.projectSync/);
  assert.match(app, /syncToCloud\(false, true\)/);
  assert.doesNotMatch(source, /labs\.wiplash\.ai\/labeloo\/api/);
});
