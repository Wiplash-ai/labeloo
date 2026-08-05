import { STORAGE_KEY, sanitizeWorkspace } from "./model.js";

const extensionStorage = globalThis.chrome?.storage?.local;

export async function loadWorkspace() {
  if (extensionStorage) {
    const result = await extensionStorage.get(STORAGE_KEY);
    return sanitizeWorkspace(result[STORAGE_KEY]);
  }
  try {
    return sanitizeWorkspace(JSON.parse(localStorage.getItem(STORAGE_KEY)));
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
  let selection = "";
  if (extensionStorage) {
    const result = await extensionStorage.get("labelooPendingSelection");
    selection = String(result.labelooPendingSelection || "").trim();
    if (selection) await extensionStorage.remove("labelooPendingSelection");
  } else {
    selection = String(localStorage.getItem("labelooPendingSelection") || "").trim();
    if (selection) localStorage.removeItem("labelooPendingSelection");
  }
  return selection || null;
}

export async function queuePendingSelection(selection) {
  const value = String(selection || "").trim();
  if (!value) return;
  if (extensionStorage) {
    await extensionStorage.set({ labelooPendingSelection: value });
  } else {
    localStorage.setItem("labelooPendingSelection", value);
  }
}
