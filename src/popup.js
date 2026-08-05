import { ExternalLink, Plus, createIcons } from "lucide";

createIcons({ icons: { ExternalLink, Plus } });

const addressInput = document.getElementById("addressInput");
const addButton = document.getElementById("addButton");
const openButton = document.getElementById("openButton");
const message = document.getElementById("message");

async function openEditor() {
  if (globalThis.chrome?.runtime?.sendMessage) {
    await chrome.runtime.sendMessage({ type: "labeloo:open-editor" });
  } else {
    window.open("app.html", "_blank", "noopener");
  }
}

openButton.addEventListener("click", openEditor);
addButton.addEventListener("click", async () => {
  const selection = addressInput.value.trim();
  if (!selection) {
    message.textContent = "Paste an address first.";
    return;
  }
  if (globalThis.chrome?.storage?.local) {
    await chrome.storage.local.set({ labelooPendingSelection: selection });
  } else {
    localStorage.setItem("labelooPendingSelection", selection);
  }
  message.textContent = "Added. Opening your sheet…";
  await openEditor();
  window.close();
});
