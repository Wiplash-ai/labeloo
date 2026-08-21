const MENU_ID = "labeloo-add-selection";
const NEW_TAB_URLS = new Set([
  "about:blank",
  "about:home",
  "about:newtab",
  "chrome://newtab/",
  "edge://newtab/",
  "opera://startpage/",
  "opera://startpageshared/"
]);

function isNewTab(tab) {
  const url = tab?.pendingUrl || tab?.url || "";
  return NEW_TAB_URLS.has(url);
}

function openEditor(tab, reuseNewTab = false) {
  const url = chrome.runtime.getURL("app.html");
  if (reuseNewTab && Number.isInteger(tab?.id) && isNewTab(tab)) {
    return chrome.tabs.update(tab.id, { url });
  }
  return chrome.tabs.create({
    url,
    active: true,
    ...(Number.isInteger(tab?.index) ? { index: tab.index + 1 } : {})
  });
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

chrome.action.onClicked.addListener((tab) => {
  openEditor(tab, true);
});
