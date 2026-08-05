import { STORAGE_KEY, sanitizeWorkspace } from "./model.js";

const LEGACY_STORAGE_KEY = "labelooWorkspaceV1";

const extensionStorage = globalThis.chrome?.storage?.local;

export async function loadWorkspace() {
  if (extensionStorage) {
    const result = await extensionStorage.get([STORAGE_KEY, LEGACY_STORAGE_KEY]);
    return sanitizeWorkspace(result[STORAGE_KEY] || result[LEGACY_STORAGE_KEY]);
  }
  try {
    return sanitizeWorkspace(JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)));
  } catch {
    return sanitizeWorkspace(null);
  }
}

export async function saveWorkspace(workspace) {
  const clean = sanitizeWorkspace(workspace);
  if (extensionStorage) {
    await extensionStorage.set({ [STORAGE_KEY]: clean });
    return clean;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

export async function takePendingSelection() {
  let selection = null;
  if (extensionStorage) {
    const result = await extensionStorage.get("labelooPendingSelection");
    selection = result.labelooPendingSelection || null;
    if (selection) await extensionStorage.remove("labelooPendingSelection");
  } else {
    const raw = localStorage.getItem("labelooPendingSelection");
    try { selection = raw ? JSON.parse(raw) : null; } catch { selection = raw; }
    if (selection) localStorage.removeItem("labelooPendingSelection");
  }
  if (!selection) return null;
  return typeof selection === "string" ? { type: "address", value: selection.trim() } : selection;
}

export async function queuePendingSelection(selection, type = "address") {
  const value = String(selection || "").trim();
  if (!value) return;
  const payload = { type, value };
  if (extensionStorage) {
    await extensionStorage.set({ labelooPendingSelection: payload });
  } else {
    localStorage.setItem("labelooPendingSelection", JSON.stringify(payload));
  }
}
