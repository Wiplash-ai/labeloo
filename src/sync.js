const ACCOUNT_KEY = "labelooAccountV1";
const extensionStorage = globalThis.chrome?.storage?.local;

function defaultApiBase() {
  if (["127.0.0.1", "localhost"].includes(location.hostname)) return "http://127.0.0.1:8790/api/v1";
  return "https://labs.wiplash.ai/labeloo/api/v1";
}

export async function loadAccount() {
  let value;
  if (extensionStorage) value = (await extensionStorage.get(ACCOUNT_KEY))[ACCOUNT_KEY];
  else {
    try { value = JSON.parse(localStorage.getItem(ACCOUNT_KEY)); } catch { value = null; }
  }
  return {
    apiBase: value?.apiBase || defaultApiBase(),
    token: value?.token || "",
    user: value?.user || null,
    projectId: value?.projectId || "",
    revision: Number(value?.revision || 0),
    conflict: value?.conflict || null
  };
}

export async function saveAccount(account) {
  const clean = { ...account, apiBase: String(account.apiBase || defaultApiBase()).replace(/\/$/, "") };
  if (extensionStorage) await extensionStorage.set({ [ACCOUNT_KEY]: clean });
  else localStorage.setItem(ACCOUNT_KEY, JSON.stringify(clean));
  return clean;
}

async function requestOriginPermission(apiBase) {
  if (!globalThis.chrome?.permissions?.request) return true;
  const origin = `${new URL(apiBase).origin}/*`;
  return chrome.permissions.request({ origins: [origin] });
}

async function api(account, path, options = {}) {
  if (!(await requestOriginPermission(account.apiBase))) throw new Error("Labeloo needs permission to reach the selected sync service.");
  const response = await fetch(`${account.apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(account.token ? { Authorization: `Bearer ${account.token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.detail || payload.error || {};
    const error = new Error(detail.message || "The Labeloo service could not complete that request.");
    error.code = detail.code;
    error.payload = detail;
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function authenticate(account, mode, fields) {
  const payload = await api(account, `/auth/${mode}`, { method: "POST", body: JSON.stringify(fields) });
  return saveAccount({ ...account, token: payload.credential.access_token, user: payload.user, conflict: null });
}

export async function logout(account) {
  try { await api(account, "/auth/logout", { method: "POST" }); } catch { /* local logout still succeeds */ }
  return saveAccount({ ...account, token: "", user: null, projectId: "", revision: 0, conflict: null });
}

export async function ensureProject(account, workspace) {
  if (account.projectId) return account;
  const listed = await api(account, "/projects");
  const existing = listed.items.find((item) => item.client_id === workspace.clientId);
  if (existing) return saveAccount({ ...account, projectId: existing.id, revision: existing.revision });
  const created = await api(account, "/projects", { method: "POST", body: JSON.stringify({ name: workspace.projectName, workspace }) });
  return saveAccount({ ...account, projectId: created.project.id, revision: created.project.revision });
}

export async function pushWorkspace(account, workspace, force = false) {
  let current = await ensureProject(account, workspace);
  if (force && current.conflict?.revision) current = { ...current, revision: current.conflict.revision };
  try {
    const payload = await api(current, `/projects/${current.projectId}`, { method: "PUT", body: JSON.stringify({ base_revision: current.revision, workspace }) });
    return saveAccount({ ...current, revision: payload.project.revision, conflict: null });
  } catch (error) {
    if (error.status === 409 && error.payload?.project) {
      await saveAccount({ ...current, conflict: error.payload.project });
    }
    throw error;
  }
}

export async function pullWorkspace(account) {
  if (!account.projectId) throw new Error("No cloud project is connected yet.");
  const payload = await api(account, `/projects/${account.projectId}`);
  await saveAccount({ ...account, revision: payload.project.revision, conflict: null });
  return payload.project.workspace;
}
