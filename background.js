const MENU_ID = "labeloo-add-selection";

function openEditor() {
  return chrome.tabs.create({ url: chrome.runtime.getURL("app.html") });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Add selection to Labeloo",
      contexts: ["selection"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText?.trim()) return;
  await chrome.storage.local.set({ labelooPendingSelection: { type: "custom", value: info.selectionText.trim() } });
  await openEditor();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "labeloo:open-editor") return false;
  openEditor().then(() => sendResponse({ ok: true }));
  return true;
});
