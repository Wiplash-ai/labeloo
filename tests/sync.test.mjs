import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeServiceBase } from "../src/sync.js";

test("account service URLs require HTTPS outside loopback", () => {
  assert.equal(normalizeServiceBase("https://auth.wiplash.ai/labeloo/"), "https://auth.wiplash.ai/labeloo");
  assert.equal(normalizeServiceBase("http://127.0.0.1:3040/labeloo"), "http://127.0.0.1:3040/labeloo");
  assert.throws(() => normalizeServiceBase("http://auth.wiplash.ai/labeloo"), /HTTPS/);
  assert.throws(() => normalizeServiceBase("https://user:secret@auth.wiplash.ai/labeloo"), /invalid/);
});

test("Wiplash identity, Drive selection, and project sync remain separate client actions", async () => {
  const source = await readFile(new URL("../src/sync.js", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(source, /\/v1\/auth\/device-authorizations/);
  assert.match(source, /\/v1\/google-drive\/authorizations/);
  assert.match(source, /assertNoProviderCredentials/);
  assert.match(app, /account\.syncEnabled && account\.capabilities\.projectSync/);
  assert.match(app, /syncToCloud\(false, true\)/);
  assert.doesNotMatch(source, /labs\.wiplash\.ai\/labeloo\/api/);
});
