const ACCOUNT_KEY = "labelooWiplashAccountV2";
const LEGACY_ACCOUNT_KEY = "labelooAccountV1";
const extensionStorage = globalThis.chrome?.storage?.local;
const ACCOUNT_SERVICE_PRODUCTION = "https://auth.wiplash.ai/labeloo";
const ACCOUNT_SERVICE_LOCAL = "http://127.0.0.1:3040/labeloo";
const PROVIDER_CREDENTIAL_KEY = /^(?:access[_-]?token|refresh[_-]?token|id[_-]?token|client[_-]?secret|password|cookie)$/i;

function isExtensionApp() {
  return /^(?:chrome|moz)-extension:$/.test(globalThis.location?.protocol || "");
}

function defaultServiceBase() {
  return ["127.0.0.1", "localhost"].includes(globalThis.location?.hostname)
    ? ACCOUNT_SERVICE_LOCAL
    : ACCOUNT_SERVICE_PRODUCTION;
}

export function normalizeServiceBase(value = defaultServiceBase()) {
  const url = new URL(String(value));
  const local = url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname);
  if (url.protocol !== "https:" && !local) throw new Error("Labeloo account services must use HTTPS.");
  if (url.username || url.password || url.search || url.hash) throw new Error("The Labeloo account service URL is invalid.");
  return url.toString().replace(/\/$/, "");
}

function blankAccount(overrides = {}) {
  return {
    serviceBase: defaultServiceBase(),
    credential: "",
    credentialExpiresAt: "",
    user: null,
    capabilities: { projectSync: false, googleDrive: false },
    csrfToken: "",
    syncEnabled: false,
    projectId: "",
    revision: 0,
    conflict: null,
    legacyAccountDetected: false,
    ...overrides,
  };
}

async function getStored(keys) {
  if (extensionStorage) return extensionStorage.get(keys);
  return Object.fromEntries(keys.map((key) => {
    try { return [key, JSON.parse(localStorage.getItem(key))]; } catch { return [key, null]; }
  }));
}

async function setStored(key, value) {
  if (extensionStorage) await extensionStorage.set({ [key]: value });
  else localStorage.setItem(key, JSON.stringify(value));
}

async function removeStored(key) {
  if (extensionStorage) await extensionStorage.remove(key);
  else localStorage.removeItem(key);
}

function storedAccount(account) {
  return {
    serviceBase: normalizeServiceBase(account.serviceBase),
    credential: isExtensionApp() ? String(account.credential || "") : "",
    credentialExpiresAt: isExtensionApp() ? String(account.credentialExpiresAt || "") : "",
    user: isExtensionApp() ? account.user || null : null,
    capabilities: account.capabilities || { projectSync: false, googleDrive: false },
    syncEnabled: Boolean(account.syncEnabled),
    projectId: String(account.projectId || ""),
    revision: Number(account.revision || 0),
    conflict: account.conflict || null,
    legacyAccountDetected: Boolean(account.legacyAccountDetected),
  };
}

export async function loadAccount() {
  const stored = await getStored([ACCOUNT_KEY, LEGACY_ACCOUNT_KEY]);
  const legacyAccountDetected = Boolean(stored[LEGACY_ACCOUNT_KEY]?.token || stored[LEGACY_ACCOUNT_KEY]?.user);
  if (legacyAccountDetected) await removeStored(LEGACY_ACCOUNT_KEY);
  const value = stored[ACCOUNT_KEY] || {};
  const account = blankAccount({
    ...value,
    serviceBase: normalizeServiceBase(value.serviceBase || defaultServiceBase()),
    credential: isExtensionApp() ? String(value.credential || "") : "",
    credentialExpiresAt: isExtensionApp() ? String(value.credentialExpiresAt || "") : "",
    csrfToken: "",
    legacyAccountDetected: Boolean(value.legacyAccountDetected || legacyAccountDetected),
  });
  if (legacyAccountDetected) await setStored(ACCOUNT_KEY, storedAccount(account));
  return account;
}

export async function saveAccount(account) {
  const clean = blankAccount({ ...account, serviceBase: normalizeServiceBase(account.serviceBase) });
  await setStored(ACCOUNT_KEY, storedAccount(clean));
  return clean;
}

function accountOriginPermission(serviceBase) {
  return `${new URL(normalizeServiceBase(serviceBase)).origin}/*`;
}

export function accountServicePermissions(serviceBase, options = {}) {
  const protocol = options.protocol ?? globalThis.location?.protocol ?? "";
  const manifest = options.manifest ?? globalThis.chrome?.runtime?.getManifest?.() ?? {};
  const permissions = { origins: [accountOriginPermission(serviceBase)] };
  const firefoxDataCollection = manifest.browser_specific_settings
    ?.gecko
    ?.data_collection_permissions
    ?.optional;

  if (protocol === "moz-extension:" && Array.isArray(firefoxDataCollection) && firefoxDataCollection.length) {
    permissions.data_collection = [...firefoxDataCollection];
  }

  return permissions;
}

async function servicePermission(account, interactive) {
  if (!isExtensionApp() || !globalThis.chrome?.permissions) return true;
  const permissions = accountServicePermissions(account.serviceBase);
  if (await chrome.permissions.contains(permissions)) return true;
  return interactive ? chrome.permissions.request(permissions) : false;
}

function assertNoProviderCredentials(value, allowAppCredential = false, path = []) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoProviderCredentials(entry, allowAppCredential, [...path, index]));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    const appCredential = allowAppCredential
      && key === "accessToken"
      && path.join(".") === "credential"
      && typeof nested === "string"
      && nested.startsWith("loo_account_");
    if (PROVIDER_CREDENTIAL_KEY.test(key) && !appCredential) {
      throw new Error("The Labeloo account service returned an unsafe credential-shaped response.");
    }
    assertNoProviderCredentials(nested, allowAppCredential, [...path, key]);
  }
}

function accountHeaders(account, options) {
  return {
    ...(options.json === false ? {} : { "Content-Type": "application/json" }),
    ...(account.credential ? { Authorization: `Bearer ${account.credential}` } : {}),
    ...(account.csrfToken && !account.credential && !["GET", "HEAD"].includes(options.method || "GET")
      ? { "X-Labeloo-CSRF": account.csrfToken }
      : {}),
    ...(options.headers || {}),
  };
}

async function api(account, path, options = {}) {
  if (!(await servicePermission(account, Boolean(options.interactivePermission)))) {
    throw new Error("Labeloo needs permission to reach Wiplash.ai account services.");
  }
  const response = await fetch(`${normalizeServiceBase(account.serviceBase)}${path}`, {
    ...options,
    headers: accountHeaders(account, options),
    credentials: isExtensionApp() ? "omit" : "include",
    signal: options.signal || AbortSignal.timeout(30_000),
  });
  if (options.responseType === "arrayBuffer") {
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw Object.assign(new Error(payload.message || "That Google Drive workbook could not be downloaded."), { status: response.status });
    }
    return {
      bytes: await response.arrayBuffer(),
      sourceName: options.sourceName || "Google Sheet.xlsx",
    };
  }
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "The Labeloo account service could not complete that request.");
    error.code = payload.code;
    error.payload = payload;
    error.status = response.status;
    throw error;
  }
  assertNoProviderCredentials(payload, Boolean(options.allowAppCredential));
  return payload;
}

function withSnapshot(account, snapshot) {
  return {
    ...account,
    user: snapshot.account ? {
      id: snapshot.account.id,
      name: snapshot.account.displayName,
      email: snapshot.account.email,
      mode: snapshot.account.mode,
      expiresAt: snapshot.account.expiresAt,
    } : null,
    capabilities: snapshot.capabilities || { projectSync: false, googleDrive: false },
    csrfToken: snapshot.csrfToken || "",
    ...(snapshot.account ? {} : { credential: "", credentialExpiresAt: "", syncEnabled: false, projectId: "", revision: 0, conflict: null }),
  };
}

export async function refreshAccount(account) {
  if (isExtensionApp() && !account.credential) return withSnapshot(account, { account: null, capabilities: account.capabilities });
  try {
    const snapshot = await api(account, "/v1/account", { signal: AbortSignal.timeout(5000) });
    return saveAccount(withSnapshot(account, snapshot));
  } catch (error) {
    if (error.status === 401) return saveAccount(withSnapshot(account, { account: null, capabilities: account.capabilities }));
    throw error;
  }
}

function delay(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("The sign-in was cancelled.", "AbortError"));
    }, { once: true });
  });
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomBase64url(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function createExtensionPkce() {
  const verifier = randomBase64url(64);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64url(new Uint8Array(digest)) };
}

function extensionIdentity() {
  return globalThis.chrome?.identity || globalThis.browser?.identity || null;
}

async function seamlessExtensionSignIn(account, onStatus, signal) {
  const identity = extensionIdentity();
  if (!identity?.getRedirectURL || !identity?.launchWebAuthFlow) {
    throw Object.assign(new Error("Seamless browser sign-in is unavailable."), { code: "extension_auth_unavailable" });
  }
  const redirectUri = identity.getRedirectURL();
  const state = randomBase64url(32);
  const pkce = await createExtensionPkce();
  const pending = await api(account, "/v1/auth/extension-authorizations", {
    method: "POST",
    body: JSON.stringify({ redirectUri, state, codeChallenge: pkce.challenge }),
    interactivePermission: true,
    signal,
  });
  onStatus("Finish signing in with Wiplash.ai in the secure browser window…");
  const completedUrl = await identity.launchWebAuthFlow({ url: pending.authorizationUrl, interactive: true });
  if (!completedUrl) throw new Error("Wiplash sign-in was cancelled.");
  const completed = new URL(completedUrl);
  const expected = new URL(redirectUri);
  if (completed.origin !== expected.origin || completed.pathname !== expected.pathname || completed.hash || !sameText(completed.searchParams.get("state"), state)) {
    throw new Error("Wiplash sign-in returned an invalid browser callback.");
  }
  const code = completed.searchParams.get("code") || "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(code)) throw new Error("Wiplash sign-in did not return a valid code.");
  const result = await api(account, `/v1/auth/extension-authorizations/${encodeURIComponent(pending.authorizationId)}/exchange`, {
    method: "POST",
    body: JSON.stringify({ code, codeVerifier: pkce.verifier, redirectUri }),
    allowAppCredential: true,
    signal,
  });
  return saveAccount(withSnapshot({
    ...account,
    credential: result.credential.accessToken,
    credentialExpiresAt: result.credential.expiresAt,
  }, result.snapshot));
}

function sameText(left, right) {
  return typeof left === "string" && typeof right === "string" && left.length > 0 && left === right;
}

async function openExternal(url) {
  if (isExtensionApp() && globalThis.chrome?.tabs?.create) {
    await chrome.tabs.create({ url });
    return;
  }
  globalThis.location.assign(url);
}

export async function signIn(account, onStatus = () => {}, signal) {
  if (!isExtensionApp()) {
    const payload = await api(account, "/v1/auth/authorizations", {
      method: "POST",
      body: JSON.stringify({ provider: "wiplash", returnUrl: globalThis.location.href }),
      interactivePermission: true,
      signal,
    });
    onStatus("Opening Wiplash.ai…");
    await openExternal(payload.authorizationUrl);
    return account;
  }

  try {
    return await seamlessExtensionSignIn(account, onStatus, signal);
  } catch (error) {
    const legacyFallback = error?.status === 404 || error?.code === "extension_auth_unavailable";
    if (!legacyFallback) throw error;
  }

  const pending = await api(account, "/v1/auth/device-authorizations", {
    method: "POST",
    body: "{}",
    interactivePermission: true,
    signal,
  });
  onStatus(`Confirm code ${pending.userCode} in the Wiplash.ai tab.`);
  await openExternal(pending.verificationUrl);
  const expiresAt = Date.parse(pending.expiresAt);
  while (Date.now() < expiresAt) {
    await delay(Math.max(1000, Number(pending.pollIntervalMs || 2000)), signal);
    const result = await api(account, `/v1/auth/device-authorizations/${encodeURIComponent(pending.authorizationId)}/exchange`, {
      method: "POST",
      body: JSON.stringify({ deviceSecret: pending.deviceSecret }),
      allowAppCredential: true,
      signal,
    });
    if (result.status !== "connected") continue;
    return saveAccount(withSnapshot({
      ...account,
      credential: result.credential.accessToken,
      credentialExpiresAt: result.credential.expiresAt,
    }, result.snapshot));
  }
  throw new Error("That Wiplash sign-in expired. Try again.");
}

export async function logout(account) {
  try {
    const payload = await api(account, "/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ returnUrl: globalThis.location.href }),
    });
    if (!isExtensionApp() && payload?.redirectUrl) globalThis.location.assign(payload.redirectUrl);
  } catch {
    // Local sign-out still removes the extension credential if the service is unavailable.
  }
  return saveAccount(blankAccount({ serviceBase: account.serviceBase, legacyAccountDetected: account.legacyAccountDetected }));
}

export async function pushWorkspace(account, workspace, force = false) {
  if (!account.user || !account.capabilities.projectSync) throw new Error("Sign in with Wiplash.ai to sync this project.");
  const projectId = account.projectId || workspace.clientId;
  const baseRevision = force && account.conflict?.revision ? account.conflict.revision : account.revision;
  try {
    const payload = await api(account, `/v1/projects/${encodeURIComponent(projectId)}`, {
      method: "PUT",
      body: JSON.stringify({ baseRevision, workspace }),
    });
    return saveAccount({ ...account, projectId, revision: payload.project.revision, conflict: null });
  } catch (error) {
    if (error.status === 409 && error.payload?.project) {
      error.account = await saveAccount({ ...account, projectId, conflict: error.payload.project });
    }
    throw error;
  }
}

export async function pullWorkspace(account) {
  if (!account.user || !account.projectId) throw new Error("No cloud project is connected yet.");
  const payload = await api(account, `/v1/projects/${encodeURIComponent(account.projectId)}`);
  const nextAccount = await saveAccount({ ...account, revision: payload.project.revision, conflict: null });
  return { workspace: payload.project.workspace, account: nextAccount };
}

async function openDriveAuthorization(url, preparedWindow) {
  const windowsApi = globalThis.browser?.windows || globalThis.chrome?.windows;
  const tabsApi = globalThis.browser?.tabs || globalThis.chrome?.tabs;
  if (isExtensionApp() && windowsApi?.create) {
    const popup = await windowsApi.create({ url, type: "popup", focused: true, width: 940, height: 760 });
    if (!Number.isInteger(popup?.id)) throw new Error("Labeloo could not open the Google Sheet chooser.");
    return {
      async close() { await windowsApi.remove(popup.id).catch(() => undefined); },
      async closed() { return windowsApi.get(popup.id).then(() => false).catch(() => true); },
    };
  }
  if (isExtensionApp() && tabsApi?.create) {
    const tab = await tabsApi.create({ url });
    return {
      async close() { if (Number.isInteger(tab?.id)) await tabsApi.remove(tab.id).catch(() => undefined); },
      async closed() { return Number.isInteger(tab?.id) ? tabsApi.get(tab.id).then(() => false).catch(() => true) : true; },
    };
  }
  if (preparedWindow && !preparedWindow.closed) {
    preparedWindow.location.href = url;
    return {
      async close() { if (!preparedWindow.closed) preparedWindow.close(); },
      async closed() { return preparedWindow.closed; },
    };
  }
  const opened = globalThis.open(url, "labeloo-google-drive");
  if (!opened) throw new Error("Allow pop-ups for Labeloo, then choose your Google Sheet again.");
  return {
    async close() { if (!opened.closed) opened.close(); },
    async closed() { return opened.closed; },
  };
}

export async function chooseGoogleDriveSheet(account, { preparedWindow = null, chooseAccount = false, onStatus = () => {}, signal } = {}) {
  if (!account.user) throw new Error("Sign in with Wiplash.ai before choosing a private Google Sheet.");
  if (!account.capabilities.googleDrive) throw new Error("Private Google Drive import is not available yet.");
  const pending = await api(account, "/v1/google-drive/authorizations", {
    method: "POST",
    body: JSON.stringify({ chooseAccount }),
    signal,
  });
  onStatus("Choose one Google Sheet in the compact Google window…");
  let authorizationWindow;
  try {
    authorizationWindow = await openDriveAuthorization(pending.authorizationUrl, preparedWindow);
    const expiresAt = Date.parse(pending.expiresAt);
    while (Date.now() < expiresAt) {
      await delay(Math.max(1000, Number(pending.pollIntervalMs || 2000)), signal);
      const status = await api(account, `/v1/google-drive/authorizations/${encodeURIComponent(pending.authorizationId)}`, { signal });
      if (status.status === "ready") {
        onStatus("Loading your selected Google Sheet…");
        return api(account, `/v1/google-drive/authorizations/${encodeURIComponent(pending.authorizationId)}/workbook`, {
          responseType: "arrayBuffer",
          sourceName: status.sourceName,
          signal,
        });
      }
      if (await authorizationWindow.closed()) throw new DOMException("Google Drive selection was cancelled.", "AbortError");
    }
  } finally {
    await authorizationWindow?.close();
  }
  throw new Error("That Google Drive selection expired. Try again.");
}

export async function consumeImportReceipt(account, receiptToken, signal) {
  if (!account.user) throw new Error("Sign in with Wiplash.ai to open that spreadsheet import.");
  const payload = await api(account, "/v1/import-receipts/consume", {
    method: "POST",
    body: JSON.stringify({ receiptToken }),
    signal,
  });
  return payload.import;
}
