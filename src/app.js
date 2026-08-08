import {
  AlignCenter,
  AlignLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardPaste,
  Cloud,
  Copy,
  Download,
  FileSpreadsheet,
  FileUp,
  Info,
  LogIn,
  MousePointer2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  X,
  createIcons
} from "lucide";
import { labelsToCsv, parseCsv } from "./csv.js";
import {
  LABEL_TYPES,
  TEMPLATES,
  activeSheet,
  blankLabel,
  blankSheet,
  labelHasContent,
  labelLines,
  labelPosition,
  getTemplate,
  parseAddressBlocks,
  parseQuickLabel,
  sanitizeWorkspace,
  sheetCount,
  validateLabel
} from "./model.js";
import { loadWorkspace, saveWorkspace, takePendingSelection } from "./storage.js";
import { authenticate, loadAccount, logout, pullWorkspace, pushWorkspace } from "./sync.js";

const ICONS = {
  AlignCenter,
  AlignLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardPaste,
  Cloud,
  Copy,
  Download,
  FileSpreadsheet,
  FileUp,
  Info,
  LogIn,
  MousePointer2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  X
};

function renderIcons() {
  document.querySelectorAll("svg[data-lucide]").forEach((icon) => icon.removeAttribute("data-lucide"));
  createIcons({ icons: ICONS });
  document.querySelectorAll("svg[data-lucide]").forEach((icon) => icon.removeAttribute("data-lucide"));
}

renderIcons();

const $ = (selector) => document.querySelector(selector);
const elements = Object.fromEntries([
  "projectName",
  "saveState",
  "importButton",
  "exportButton",
  "printButton",
  "accountButton",
  "accountButtonLabel",
  "addLabelButton",
  "searchInput",
  "labelCount",
  "sheetCount",
  "labelList",
  "pasteAddressesButton",
  "previousSheetButton",
  "nextSheetButton",
  "sheetPosition",
  "sheetSelect",
  "addSheetButton",
  "sheetMenuButton",
  "templateSelect",
  "startSlotInput",
  "zoomInput",
  "sheetStage",
  "sheetCanvas",
  "labelInspector",
  "emptyInspector",
  "editorInspector",
  "selectedPosition",
  "duplicateLabelButton",
  "deleteLabelButton",
  "labelForm",
  "labelTypeInput",
  "nameInput",
  "subtitleInput",
  "emailInput",
  "customTextInput",
  "address1Input",
  "address2Input",
  "cityInput",
  "stateInput",
  "postalInput",
  "countryInput",
  "alignmentControl",
  "fontSizeInput",
  "lineHeightInput",
  "validationSummary",
  "importDialog",
  "closeImportButton",
  "pastePanel",
  "csvPanel",
  "pasteInput",
  "csvInput",
  "csvFileName",
  "importMessage",
  "confirmImportButton",
  "toast",
  "accountDialog", "closeAccountButton", "signedOutAccount", "signedInAccount",
  "accountNameField", "accountName", "accountEmail", "accountPassword",
  "accountSubmit", "accountUserName", "accountUserEmail", "cloudProjectStatus",
  "conflictActions", "useCloudButton", "keepLocalButton", "syncNowButton", "logoutButton",
  "accountMessage", "printPortal", "sheetDialog", "sheetDialogTitle", "sheetNameInput",
  "sheetTypeInput", "deleteSheetButton", "saveSheetButton", "replaceLabelDialog",
  "replaceLabelMessage", "closeReplaceLabelButton", "cancelReplaceLabelButton", "confirmReplaceLabelButton"
].map((id) => [id, document.getElementById(id)]));

let state = await loadWorkspace();
let csvText = "";
let activeImportTab = "paste";
let saveTimer = null;
let toastTimer = null;
let cloudTimer = null;
let account = await loadAccount();
let accountMode = "login";
let sheetDialogMode = "create";
let pendingLabelCopy = null;
let draggedLabelId = null;

const currentSheet = () => activeSheet(state);
const currentLabels = () => currentSheet().labels;
const currentTemplate = () => getTemplate(currentSheet().templateId);

if (!state.selectedId && currentLabels()[0]) state.selectedId = currentLabels()[0].id;

const pendingSelection = await takePendingSelection();
if (pendingSelection) {
  const captured = parseQuickLabel(pendingSelection.type, pendingSelection.value);
  if (captured) {
    currentLabels().push(captured);
    state.selectedId = captured.id;
    const position = labelPosition(currentLabels().length - 1, currentSheet().startSlot, currentSheet().templateId);
    currentSheet().activePage = position.sheet;
    queueMicrotask(() => showToast(`${LABEL_TYPES[captured.type].label} added`));
  }
}

function selectedLabel() {
  return currentLabels().find((label) => label.id === state.selectedId) || null;
}

function selectedIndex() {
  return currentLabels().findIndex((label) => label.id === state.selectedId);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 2400);
}

function scheduleSave() {
  elements.saveState.textContent = "Saving…";
  elements.saveState.classList.add("saving");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    state = await saveWorkspace(state);
    elements.saveState.textContent = "Saved locally";
    elements.saveState.classList.remove("saving");
    if (account.token && !account.conflict) {
      clearTimeout(cloudTimer);
      cloudTimer = setTimeout(() => syncToCloud(), 850);
    }
  }, 220);
}

function renderAccount() {
  const signedIn = Boolean(account.token && account.user);
  elements.accountButtonLabel.textContent = signedIn ? "Account" : "Sign in";
  elements.signedOutAccount.classList.toggle("hidden", signedIn);
  elements.signedInAccount.classList.toggle("hidden", !signedIn);
  elements.conflictActions.classList.toggle("hidden", !account.conflict);
  if (signedIn) {
    elements.accountUserName.textContent = account.user.name;
    elements.accountUserEmail.textContent = account.user.email;
    elements.cloudProjectStatus.textContent = account.conflict ? "Needs your choice" : account.projectId ? `Cloud revision ${account.revision}` : "Ready for first sync";
  }
}

function setAccountMessage(message, isError = false) {
  elements.accountMessage.textContent = message;
  elements.accountMessage.classList.toggle("error", isError);
}

async function syncToCloud(force = false) {
  if (!account.token) return;
  elements.saveState.textContent = "Syncing…";
  try {
    account = await pushWorkspace(account, sanitizeWorkspace(state), force);
    elements.saveState.textContent = "Saved + synced";
    setAccountMessage("Project synced.");
  } catch (error) {
    account = await loadAccount();
    elements.saveState.textContent = account.conflict ? "Sync needs review" : "Saved locally";
    setAccountMessage(error.message, true);
  }
  renderAccount();
}

function printLabels() {
  elements.printPortal.replaceChildren();
  const sheetSet = currentSheet();
  const selectedTemplate = getTemplate(sheetSet.templateId);
  const count = sheetCount(sheetSet);
  for (let sheet = 0; sheet < count; sheet += 1) {
    const page = document.createElement("section");
    page.className = "print-sheet";
    page.style.width = `${selectedTemplate.pageWidthIn}in`;
    page.style.height = `${selectedTemplate.pageHeightIn}in`;
    for (let slot = 0; slot < selectedTemplate.labelsPerSheet; slot += 1) {
      const globalSlot = sheet * selectedTemplate.labelsPerSheet + slot;
      const index = globalSlot - (sheetSet.startSlot - 1);
      const label = index >= 0 ? sheetSet.labels[index] : null;
      const cell = document.createElement("div");
      cell.className = `print-label${label ? ` align-${label.align}` : ""}`;
      const row = Math.floor(slot / selectedTemplate.columns);
      const column = slot % selectedTemplate.columns;
      cell.style.left = `${selectedTemplate.leftMarginIn + (column * selectedTemplate.horizontalPitchIn)}in`;
      cell.style.top = `${selectedTemplate.topMarginIn + (row * selectedTemplate.verticalPitchIn)}in`;
      cell.style.width = `${selectedTemplate.labelWidthIn}in`;
      cell.style.height = `${selectedTemplate.labelHeightIn}in`;
      if (label) {
        cell.style.fontSize = `${label.fontSize}pt`;
        cell.style.lineHeight = String(label.lineHeight);
        labelLines(label).forEach((line) => { const span = document.createElement("span"); span.textContent = line; cell.append(span); });
      }
      page.append(cell);
    }
    elements.printPortal.append(page);
  }
  elements.printPortal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => window.print());
}

function selectLabel(id, moveToSheet = true, focusEditor = false) {
  state.selectedId = id;
  if (moveToSheet) {
    const index = selectedIndex();
    if (index >= 0) currentSheet().activePage = labelPosition(index, currentSheet().startSlot, currentSheet().templateId).sheet;
  }
  render();
  scheduleSave();
  if (focusEditor) {
    queueMicrotask(() => {
      const label = selectedLabel();
      const input = label?.type === "custom"
        ? elements.customTextInput
        : label?.type === "email"
          ? elements.emailInput
          : elements.nameInput;
      input?.focus({ preventScroll: true });
    });
  }
}

function clearDragState() {
  elements.sheetCanvas.querySelectorAll(".drag-source, .drag-target, .drag-target--replace").forEach((cell) => {
    cell.classList.remove("drag-source", "drag-target", "drag-target--replace");
  });
}

function copyLabelToRecord(sourceId, targetRecordIndex) {
  const sheet = currentSheet();
  const source = sheet.labels.find((label) => label.id === sourceId);
  if (!source || targetRecordIndex < 0) return;
  const existing = sheet.labels[targetRecordIndex] || null;
  const copy = blankLabel({ ...source, id: existing?.id });
  while (sheet.labels.length < targetRecordIndex) sheet.labels.push(blankLabel({ type: sheet.defaultType }));
  if (existing) sheet.labels[targetRecordIndex] = copy;
  else sheet.labels.push(copy);
  state.selectedId = copy.id;
  render();
  scheduleSave();
  showToast(existing ? "Label replaced" : "Label copied");
}

function requestLabelCopy(sourceId, targetRecordIndex, targetSlot) {
  const sheet = currentSheet();
  const source = sheet.labels.find((label) => label.id === sourceId);
  const target = sheet.labels[targetRecordIndex] || null;
  if (!source || targetRecordIndex < 0 || target?.id === source.id) return;
  if (!target || !labelHasContent(target)) {
    copyLabelToRecord(sourceId, targetRecordIndex);
    return;
  }
  pendingLabelCopy = { sourceId, targetRecordIndex };
  elements.replaceLabelMessage.textContent = `Position ${targetSlot + 1} already contains ${target.name || "label content"}. Replace it with ${source.name || "the dragged label"}?`;
  elements.replaceLabelDialog.showModal();
  queueMicrotask(() => elements.confirmReplaceLabelButton.focus());
}

function createListItem(label, index) {
  const item = document.createElement("article");
  item.className = `label-list-item${label.id === state.selectedId ? " selected" : ""}`;
  item.dataset.id = label.id;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "label-list-main";
  button.addEventListener("click", () => selectLabel(label.id));
  button.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    selectLabel(label.id);
    queueMicrotask(() => elements.nameInput.focus());
  });

  const indexBadge = document.createElement("span");
  indexBadge.className = "label-index";
  indexBadge.textContent = String(index + 1).padStart(2, "0");

  const copy = document.createElement("span");
  copy.className = "label-list-copy";
  const title = document.createElement("strong");
  title.textContent = label.name || "Untitled label";
  const address = document.createElement("small");
  address.textContent = labelLines(label).slice(label.name ? 1 : 0).join(" · ") || LABEL_TYPES[label.type].description;
  copy.append(title, address);
  button.append(indexBadge, copy);

  const movement = document.createElement("span");
  movement.className = "label-movement";
  const up = document.createElement("button");
  up.type = "button";
  up.className = "mini-icon";
  up.title = "Move label up";
  up.disabled = index === 0;
  up.innerHTML = '<i data-lucide="chevron-up"></i>';
  up.addEventListener("click", () => moveLabel(index, index - 1));
  const down = document.createElement("button");
  down.type = "button";
  down.className = "mini-icon";
  down.title = "Move label down";
  down.disabled = index === currentLabels().length - 1;
  down.innerHTML = '<i data-lucide="chevron-down"></i>';
  down.addEventListener("click", () => moveLabel(index, index + 1));
  movement.append(up, down);

  item.append(button, movement);
  return item;
}

function renderList() {
  const query = elements.searchInput.value.trim().toLowerCase();
  elements.labelList.replaceChildren();
  currentLabels().forEach((label, index) => {
    const searchable = labelLines(label).join(" ").toLowerCase();
    if (!query || searchable.includes(query)) elements.labelList.append(createListItem(label, index));
  });

  if (!elements.labelList.children.length) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = currentLabels().length ? "No labels match that search." : "Add a label or import a list.";
    elements.labelList.append(empty);
  }
  renderIcons();
}

function slotForSheet(slot) {
  const sheet = currentSheet();
  const selectedTemplate = getTemplate(sheet.templateId);
  const globalSlot = sheet.activePage * selectedTemplate.labelsPerSheet + slot;
  const recordIndex = globalSlot - (sheet.startSlot - 1);
  return recordIndex >= 0 ? { label: sheet.labels[recordIndex], recordIndex } : { label: null, recordIndex };
}

function createSheetSlot(slot) {
  const selectedTemplate = currentTemplate();
  const row = Math.floor(slot / selectedTemplate.columns);
  const column = slot % selectedTemplate.columns;
  const { label, recordIndex } = slotForSheet(slot);
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = "sheet-label";
  cell.style.left = `${selectedTemplate.leftMarginIn + (column * selectedTemplate.horizontalPitchIn)}in`;
  cell.style.top = `${selectedTemplate.topMarginIn + (row * selectedTemplate.verticalPitchIn)}in`;
  cell.style.width = `${selectedTemplate.labelWidthIn}in`;
  cell.style.height = `${selectedTemplate.labelHeightIn}in`;
  cell.setAttribute("aria-label", label ? `Edit ${label.name || `label ${recordIndex + 1}`}` : `Empty slot ${slot + 1}`);
  cell.dataset.slot = String(slot);
  cell.dataset.recordIndex = String(recordIndex);

  const slotNumber = document.createElement("span");
  slotNumber.className = "slot-number";
  slotNumber.textContent = String(slot + 1);
  cell.append(slotNumber);

  if (!label) {
    cell.classList.add("empty");
    cell.tabIndex = -1;
  } else {
    cell.draggable = true;
    if (label.id === state.selectedId) cell.classList.add("selected");
    const content = document.createElement("span");
    content.className = `sheet-label-content align-${label.align}`;
    content.style.fontSize = `${label.fontSize}pt`;
    content.style.lineHeight = String(label.lineHeight);
    labelLines(label).forEach((line) => {
      const lineNode = document.createElement("span");
      lineNode.textContent = line;
      content.append(lineNode);
    });
    cell.append(content);
    cell.addEventListener("click", () => selectLabel(label.id, false, true));
    cell.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      selectLabel(label.id, false, true);
    });
    cell.addEventListener("dragstart", (event) => {
      draggedLabelId = label.id;
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("application/x-labeloo-label", label.id);
      event.dataTransfer.setData("text/plain", label.id);
      cell.classList.add("drag-source");
    });
    cell.addEventListener("dragend", () => {
      draggedLabelId = null;
      clearDragState();
    });
  }

  cell.addEventListener("dragover", (event) => {
    const sourceId = draggedLabelId
      || event.dataTransfer.getData("application/x-labeloo-label")
      || event.dataTransfer.getData("text/plain");
    if (!sourceId || label?.id === sourceId || recordIndex < 0) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    cell.classList.add("drag-target");
    cell.classList.toggle("drag-target--replace", Boolean(label && labelHasContent(label)));
  });
  cell.addEventListener("dragleave", () => cell.classList.remove("drag-target", "drag-target--replace"));
  cell.addEventListener("drop", (event) => {
    event.preventDefault();
    const sourceId = draggedLabelId
      || event.dataTransfer.getData("application/x-labeloo-label")
      || event.dataTransfer.getData("text/plain");
    draggedLabelId = null;
    clearDragState();
    requestLabelCopy(sourceId, recordIndex, slot);
  });
  return cell;
}

function renderSheet() {
  const sheet = currentSheet();
  const selectedTemplate = getTemplate(sheet.templateId);
  const totalSheets = sheetCount(sheet);
  sheet.activePage = Math.min(Math.max(0, sheet.activePage), totalSheets - 1);
  elements.sheetCanvas.replaceChildren(...Array.from({ length: selectedTemplate.labelsPerSheet }, (_, slot) => createSheetSlot(slot)));
  elements.sheetCanvas.style.width = `${selectedTemplate.pageWidthIn}in`;
  elements.sheetCanvas.style.height = `${selectedTemplate.pageHeightIn}in`;
  elements.sheetCanvas.style.transform = `scale(${state.zoom / 100})`;
  elements.sheetStage.style.setProperty("--sheet-scale", String(state.zoom / 100));
  elements.sheetPosition.textContent = `Page ${sheet.activePage + 1} of ${totalSheets}`;
  elements.previousSheetButton.disabled = sheet.activePage === 0;
  elements.nextSheetButton.disabled = sheet.activePage >= totalSheets - 1;
}

function fillEditor(label) {
  const fields = ["name", "subtitle", "email", "customText", "address1", "address2", "city", "state", "postal", "country"];
  fields.forEach((field) => {
    elements[`${field}Input`].value = label[field];
  });
  elements.labelTypeInput.value = label.type;
  document.querySelectorAll("[data-label-types]").forEach((field) => {
    field.classList.toggle("hidden", !field.dataset.labelTypes.split(" ").includes(label.type));
  });
  const validation = validateLabel(label);
  elements.validationSummary.className = `validation-summary field--wide ${validation.valid ? "valid" : "needs-attention"}`;
  elements.validationSummary.textContent = validation.valid
    ? `${LABEL_TYPES[label.type].label} details look ready to print.`
    : `Check ${Object.keys(validation.errors).length} field${Object.keys(validation.errors).length === 1 ? "" : "s"} before printing.`;
  ["name", "email", "customText", "address1", "city", "state", "postal"].forEach((field) => {
    const error = document.getElementById(`${field}Error`);
    const input = elements[`${field}Input`];
    if (!error || !input) return;
    error.textContent = validation.errors[field] || "";
    input.setAttribute("aria-invalid", validation.errors[field] ? "true" : "false");
  });
  elements.fontSizeInput.value = label.fontSize;
  elements.lineHeightInput.value = label.lineHeight;
  elements.alignmentControl.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("selected", button.dataset.align === label.align);
  });
  const index = selectedIndex();
  const position = labelPosition(index, currentSheet().startSlot, currentSheet().templateId);
  elements.selectedPosition.textContent = `Label ${index + 1} · Page ${position.sheet + 1}, position ${position.slot + 1}`;
}

function renderInspector() {
  const label = selectedLabel();
  elements.emptyInspector.classList.toggle("hidden", Boolean(label));
  elements.editorInspector.classList.toggle("hidden", !label);
  if (label) fillEditor(label);
}

function renderMeta() {
  const sheet = currentSheet();
  const totalSheets = sheetCount(sheet);
  elements.projectName.value = state.projectName;
  elements.labelCount.textContent = `${sheet.labels.length} label${sheet.labels.length === 1 ? "" : "s"}`;
  elements.sheetCount.textContent = `${totalSheets} page${totalSheets === 1 ? "" : "s"}`;
  elements.startSlotInput.value = sheet.startSlot;
  const selectedTemplate = getTemplate(sheet.templateId);
  elements.templateSelect.replaceChildren(...TEMPLATES.map((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name} · ${item.labelsPerSheet} label${item.labelsPerSheet === 1 ? "" : "s"} · Letter`;
    option.selected = item.id === selectedTemplate.id;
    return option;
  }));
  elements.startSlotInput.max = String(selectedTemplate.labelsPerSheet);
  elements.zoomInput.value = state.zoom;
  elements.sheetSelect.replaceChildren(...state.sheets.map((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    option.selected = item.id === state.activeSheetId;
    return option;
  }));
}

function render() {
  renderMeta();
  renderList();
  renderSheet();
  renderInspector();
}

function addLabel(label = null) {
  const sheet = currentSheet();
  const nextLabel = label || blankLabel({ type: sheet.defaultType });
  sheet.labels.push(nextLabel);
  state.selectedId = nextLabel.id;
  sheet.activePage = labelPosition(sheet.labels.length - 1, sheet.startSlot, sheet.templateId).sheet;
  render();
  scheduleSave();
}

function moveLabel(from, to) {
  const sheet = currentSheet();
  if (to < 0 || to >= sheet.labels.length || from === to) return;
  const [label] = sheet.labels.splice(from, 1);
  sheet.labels.splice(to, 0, label);
  sheet.activePage = labelPosition(to, sheet.startSlot, sheet.templateId).sheet;
  render();
  scheduleSave();
}

function deleteSelected() {
  const index = selectedIndex();
  if (index < 0) return;
  const labels = currentLabels();
  const [removed] = labels.splice(index, 1);
  state.selectedId = labels[Math.min(index, labels.length - 1)]?.id || null;
  render();
  scheduleSave();
  showToast(`${removed.name || "Label"} removed`);
}

function duplicateSelected() {
  const index = selectedIndex();
  const current = selectedLabel();
  if (!current) return;
  const duplicate = blankLabel({ ...current, id: undefined });
  currentLabels().splice(index + 1, 0, duplicate);
  state.selectedId = duplicate.id;
  currentSheet().activePage = labelPosition(index + 1, currentSheet().startSlot, currentSheet().templateId).sheet;
  render();
  scheduleSave();
  showToast("Label duplicated");
}

function updateSelectedFromForm() {
  const label = selectedLabel();
  if (!label) return;
  label.type = elements.labelTypeInput.value;
  ["name", "subtitle", "email", "customText", "address1", "address2", "city", "state", "postal", "country"].forEach((field) => {
    label[field] = elements[`${field}Input`].value.trimStart();
  });
  label.fontSize = Math.min(14, Math.max(7, Number(elements.fontSizeInput.value) || 10));
  label.lineHeight = Math.min(1.6, Math.max(1, Number(elements.lineHeightInput.value) || 1.15));
  renderList();
  renderSheet();
  fillEditor(label);
  scheduleSave();
}

function showImportDialog(tab = "paste") {
  setImportTab(tab);
  elements.importMessage.textContent = "";
  elements.importDialog.showModal();
  setTimeout(() => (tab === "paste" ? elements.pasteInput : elements.csvInput).focus(), 0);
}

function setImportTab(tab) {
  activeImportTab = tab === "csv" ? "csv" : "paste";
  document.querySelectorAll("[data-import-tab]").forEach((button) => button.classList.toggle("selected", button.dataset.importTab === activeImportTab));
  elements.pastePanel.classList.toggle("hidden", activeImportTab !== "paste");
  elements.csvPanel.classList.toggle("hidden", activeImportTab !== "csv");
}

async function importLabels() {
  elements.importMessage.textContent = "";
  try {
    const labels = activeImportTab === "csv" ? parseCsv(csvText) : parseAddressBlocks(elements.pasteInput.value);
    if (!labels.length) throw new Error("Add at least one complete address.");
    currentLabels().push(...labels);
    state.selectedId = labels[0].id;
    currentSheet().activePage = labelPosition(currentLabels().length - labels.length, currentSheet().startSlot, currentSheet().templateId).sheet;
    elements.importDialog.close();
    elements.pasteInput.value = "";
    elements.csvInput.value = "";
    elements.csvFileName.textContent = "";
    csvText = "";
    render();
    scheduleSave();
    showToast(`${labels.length} label${labels.length === 1 ? "" : "s"} added`);
  } catch (error) {
    elements.importMessage.textContent = error.message || "Those addresses could not be imported.";
  }
}

function exportCsv() {
  const blob = new Blob([labelsToCsv(currentLabels())], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  const safeName = state.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "labeloo";
  link.href = URL.createObjectURL(blob);
  link.download = `${safeName}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("CSV exported");
}

function switchSheet(id) {
  const next = state.sheets.find((sheet) => sheet.id === id);
  if (!next) return;
  state.activeSheetId = next.id;
  state.selectedId = next.labels[0]?.id || null;
  render();
  scheduleSave();
}

function openSheetDialog(mode) {
  sheetDialogMode = mode;
  const sheet = currentSheet();
  const creating = mode === "create";
  elements.sheetDialogTitle.textContent = creating ? "Create another sheet" : "Sheet settings";
  elements.sheetNameInput.value = creating ? `${LABEL_TYPES[sheet.defaultType].label} sheet ${state.sheets.length + 1}` : sheet.name;
  elements.sheetTypeInput.value = creating ? sheet.defaultType : sheet.defaultType;
  elements.deleteSheetButton.classList.toggle("hidden", creating || state.sheets.length === 1);
  elements.sheetDialog.showModal();
  queueMicrotask(() => elements.sheetNameInput.select());
}

function saveSheetSettings() {
  const name = elements.sheetNameInput.value.trim();
  if (!name) {
    showToast("Give the sheet a name");
    elements.sheetNameInput.focus();
    return;
  }
  if (sheetDialogMode === "create") {
    const sheet = blankSheet({ name, defaultType: elements.sheetTypeInput.value });
    const first = blankLabel({ type: sheet.defaultType });
    sheet.labels.push(first);
    state.sheets.push(sheet);
    state.activeSheetId = sheet.id;
    state.selectedId = first.id;
    showToast("New sheet created");
  } else {
    currentSheet().name = name;
    currentSheet().defaultType = elements.sheetTypeInput.value;
    showToast("Sheet settings saved");
  }
  elements.sheetDialog.close();
  render();
  scheduleSave();
}

function removeCurrentSheet() {
  if (state.sheets.length === 1) return;
  const index = state.sheets.findIndex((sheet) => sheet.id === state.activeSheetId);
  const [removed] = state.sheets.splice(index, 1);
  const next = state.sheets[Math.min(index, state.sheets.length - 1)];
  state.activeSheetId = next.id;
  state.selectedId = next.labels[0]?.id || null;
  elements.sheetDialog.close();
  render();
  scheduleSave();
  showToast(`${removed.name} removed`);
}

elements.addLabelButton.addEventListener("click", () => addLabel());
elements.pasteAddressesButton.addEventListener("click", () => showImportDialog("paste"));
elements.importButton.addEventListener("click", () => showImportDialog("paste"));
elements.closeImportButton.addEventListener("click", () => elements.importDialog.close());
elements.confirmImportButton.addEventListener("click", importLabels);
elements.exportButton.addEventListener("click", exportCsv);
elements.printButton.addEventListener("click", printLabels);
window.addEventListener("afterprint", () => {
  elements.printPortal.replaceChildren();
  elements.printPortal.setAttribute("aria-hidden", "true");
});
elements.accountButton.addEventListener("click", () => {
  renderAccount();
  setAccountMessage("");
  elements.accountDialog.showModal();
});
elements.closeAccountButton.addEventListener("click", () => elements.accountDialog.close());
document.querySelectorAll("[data-account-mode]").forEach((button) => button.addEventListener("click", () => {
  accountMode = button.dataset.accountMode;
  document.querySelectorAll("[data-account-mode]").forEach((item) => item.classList.toggle("selected", item === button));
  elements.accountNameField.classList.toggle("hidden", accountMode !== "register");
  elements.accountSubmit.textContent = accountMode === "register" ? "Create account" : "Sign in";
  elements.accountPassword.autocomplete = accountMode === "register" ? "new-password" : "current-password";
}));
elements.accountSubmit.addEventListener("click", async () => {
  setAccountMessage("Connecting…");
  elements.accountSubmit.disabled = true;
  try {
    account = await authenticate(account, accountMode, {
      email: elements.accountEmail.value,
      password: elements.accountPassword.value,
      ...(accountMode === "register" ? { name: elements.accountName.value } : {})
    });
    renderAccount();
    await syncToCloud();
    showToast("Cloud sync connected");
  } catch (error) {
    setAccountMessage(error.message, true);
  } finally {
    elements.accountSubmit.disabled = false;
  }
});
elements.syncNowButton.addEventListener("click", () => syncToCloud());
elements.logoutButton.addEventListener("click", async () => {
  account = await logout(account);
  renderAccount();
  elements.accountDialog.close();
  elements.saveState.textContent = "Saved locally";
  showToast("Signed out. Local labels were kept.");
});
elements.useCloudButton.addEventListener("click", async () => {
  try {
    state = sanitizeWorkspace(await pullWorkspace(account));
    account = await loadAccount();
    await saveWorkspace(state);
    render();
    renderAccount();
    showToast("Cloud copy loaded");
  } catch (error) { setAccountMessage(error.message, true); }
});
elements.keepLocalButton.addEventListener("click", () => syncToCloud(true));
elements.searchInput.addEventListener("input", renderList);
elements.sheetSelect.addEventListener("change", () => switchSheet(elements.sheetSelect.value));
elements.addSheetButton.addEventListener("click", () => openSheetDialog("create"));
elements.sheetMenuButton.addEventListener("click", () => openSheetDialog("edit"));
elements.saveSheetButton.addEventListener("click", saveSheetSettings);
elements.deleteSheetButton.addEventListener("click", removeCurrentSheet);
elements.closeReplaceLabelButton.addEventListener("click", () => elements.replaceLabelDialog.close());
elements.cancelReplaceLabelButton.addEventListener("click", () => elements.replaceLabelDialog.close());
elements.confirmReplaceLabelButton.addEventListener("click", () => {
  if (pendingLabelCopy) copyLabelToRecord(pendingLabelCopy.sourceId, pendingLabelCopy.targetRecordIndex);
  pendingLabelCopy = null;
  elements.replaceLabelDialog.close();
});
elements.replaceLabelDialog.addEventListener("close", () => { pendingLabelCopy = null; });
elements.projectName.addEventListener("input", () => {
  state.projectName = elements.projectName.value;
  scheduleSave();
});
elements.startSlotInput.addEventListener("change", () => {
  currentSheet().startSlot = Math.min(currentTemplate().labelsPerSheet, Math.max(1, Number(elements.startSlotInput.value) || 1));
  currentSheet().activePage = 0;
  render();
  scheduleSave();
});
elements.templateSelect.addEventListener("change", () => {
  const selectedTemplate = getTemplate(elements.templateSelect.value);
  currentSheet().templateId = selectedTemplate.id;
  currentSheet().startSlot = Math.min(currentSheet().startSlot, selectedTemplate.labelsPerSheet);
  currentSheet().activePage = 0;
  render();
  scheduleSave();
  showToast(`${selectedTemplate.name} selected`);
});
elements.zoomInput.addEventListener("input", () => {
  state.zoom = Number(elements.zoomInput.value);
  renderSheet();
  scheduleSave();
});
elements.sheetStage.addEventListener("wheel", (event) => {
  if (!event.deltaY) return;
  event.preventDefault();
  const minimum = Number(elements.zoomInput.min) || 65;
  const maximum = Number(elements.zoomInput.max) || 115;
  state.zoom = Math.min(maximum, Math.max(minimum, state.zoom + (event.deltaY < 0 ? 5 : -5)));
  elements.zoomInput.value = state.zoom;
  renderSheet();
  scheduleSave();
}, { passive: false });
elements.previousSheetButton.addEventListener("click", () => {
  currentSheet().activePage -= 1;
  renderSheet();
  scheduleSave();
});
elements.nextSheetButton.addEventListener("click", () => {
  currentSheet().activePage += 1;
  renderSheet();
  scheduleSave();
});
elements.deleteLabelButton.addEventListener("click", deleteSelected);
elements.duplicateLabelButton.addEventListener("click", duplicateSelected);
elements.labelForm.addEventListener("input", updateSelectedFromForm);
elements.labelTypeInput.addEventListener("change", () => {
  const label = selectedLabel();
  if (!label) return;
  label.type = elements.labelTypeInput.value;
  render();
  scheduleSave();
});
elements.alignmentControl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-align]");
  const label = selectedLabel();
  if (!button || !label) return;
  label.align = button.dataset.align;
  render();
  scheduleSave();
});
document.querySelectorAll("[data-import-tab]").forEach((button) => button.addEventListener("click", () => setImportTab(button.dataset.importTab)));
elements.csvInput.addEventListener("change", async () => {
  const file = elements.csvInput.files?.[0];
  csvText = file ? await file.text() : "";
  elements.csvFileName.textContent = file ? `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} KB` : "";
});

window.addEventListener("beforeunload", () => {
  clearTimeout(saveTimer);
  saveWorkspace(sanitizeWorkspace(state));
});

document.addEventListener("keydown", (event) => {
  if (!event.altKey || event.ctrlKey || event.metaKey) return;
  const destinations = {
    "1": () => elements.searchInput.focus(),
    "2": () => document.getElementById("sheetWorkbench").focus(),
    "3": () => selectedLabel() ? elements.nameInput.focus() : document.getElementById("labelInspector").focus()
  };
  if (!destinations[event.key]) return;
  event.preventDefault();
  destinations[event.key]();
});

render();
renderAccount();
scheduleSave();
