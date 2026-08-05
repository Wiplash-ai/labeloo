import { ExternalLink, Plus, createIcons } from "lucide";

createIcons({ icons: { ExternalLink, Plus } });

const addressInput = document.getElementById("addressInput");
const labelType = document.getElementById("labelType");
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
    message.textContent = "Add the label details first.";
    return;
  }
  if (globalThis.chrome?.storage?.local) {
    await chrome.storage.local.set({ labelooPendingSelection: { type: labelType.value, value: selection } });
  } else {
    localStorage.setItem("labelooPendingSelection", JSON.stringify({ type: labelType.value, value: selection }));
  }
  message.textContent = "Added. Opening your sheet…";
  await openEditor();
  window.close();
});

const examples = {
  address: "Name\n123 Paper Street\nAustin, TX 78701",
  name: "Jordan Culver\nWiplash Labs",
  email: "Jordan Culver\njordan@example.com",
  custom: "Fragile\nHandle with care"
};
labelType.addEventListener("change", () => { addressInput.placeholder = examples[labelType.value]; });
