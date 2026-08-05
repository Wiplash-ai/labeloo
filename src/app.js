import {
  AlignCenter,
  AlignLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Download,
  FileSpreadsheet,
  FileUp,
  Info,
  MousePointer2,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
  createIcons
} from "lucide";
import { labelsToCsv, parseCsv } from "./csv.js";
import {
  TEMPLATE,
  blankLabel,
  labelLines,
  labelPosition,
  parseAddressBlock,
  parseAddressBlocks,
  sanitizeWorkspace,
  sheetCount
} from "./model.js";
import { loadWorkspace, saveWorkspace, takePendingSelection } from "./storage.js";

createIcons({
  icons: {
    AlignCenter,
    AlignLeft,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ClipboardPaste,
    Copy,
    Download,
    FileSpreadsheet,
    FileUp,
    Info,
    MousePointer2,
    Plus,
    Printer,
    Search,
    Trash2,
    X
  }
});

const $ = (selector) => document.querySelector(selector);
const elements = Object.fromEntries([
  "projectName",
  "saveState",
  "importButton",
  "exportButton",
  "printButton",
  "addLabelButton",
  "searchInput",
  "labelCount",
  "sheetCount",
  "labelList",
  "pasteAddressesButton",
  "previousSheetButton",
  "nextSheetButton",
  "sheetPosition",
  "templateSelect",
  "startSlotInput",
  "zoomInput",
  "sheetStage",
  "sheetCanvas",
  "emptyInspector",
  "editorInspector",
  "selectedPosition",
  "duplicateLabelButton",
  "deleteLabelButton",
  "labelForm",
  "nameInput",
  "address1Input",
  "address2Input",
  "cityInput",
  "stateInput",
  "postalInput",
  "countryInput",
  "alignmentControl",
  "fontSizeInput",
  "lineHeightInput",
  "importDialog",
  "closeImportButton",
  "pastePanel",
  "csvPanel",
  "pasteInput",
  "csvInput",
  "csvFileName",
  "importMessage",
  "confirmImportButton",
  "toast"
].map((id) => [id, document.getElementById(id)]));

let state = await loadWorkspace();
let csvText = "";
let activeImportTab = "paste";
let saveTimer = null;
let toastTimer = null;

if (!state.selectedId && state.labels[0]) state.selectedId = state.labels[0].id;

const pendingSelection = await takePendingSelection();
if (pendingSelection) {
  const captured = parseAddressBlock(pendingSelection);
  if (captured) {
    state.labels.push(captured);
    state.selectedId = captured.id;
    const position = labelPosition(state.labels.length - 1, state.startSlot);
    state.activeSheet = position.sheet;
    queueMicrotask(() => showToast("Selected address added"));
  }
}

function selectedLabel() {
  return state.labels.find((label) => label.id === state.selectedId) || null;
}

function selectedIndex() {
  return state.labels.findIndex((label) => label.id === state.selectedId);
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
  }, 220);
}

function selectLabel(id, moveToSheet = true) {
  state.selectedId = id;
  if (moveToSheet) {
    const index = selectedIndex();
    if (index >= 0) state.activeSheet = labelPosition(index, state.startSlot).sheet;
  }
  render();
  scheduleSave();
}

function createListItem(label, index) {
  const item = document.createElement("article");
  item.className = `label-list-item${label.id === state.selectedId ? " selected" : ""}`;
  item.dataset.id = label.id;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "label-list-main";
  button.addEventListener("click", () => selectLabel(label.id));

  const indexBadge = document.createElement("span");
  indexBadge.className = "label-index";
  indexBadge.textContent = String(index + 1).padStart(2, "0");

  const copy = document.createElement("span");
  copy.className = "label-list-copy";
  const title = document.createElement("strong");
  title.textContent = label.name || "Untitled label";
  const address = document.createElement("small");
  address.textContent = [label.address1, label.city, label.state].filter(Boolean).join(", ") || "No address yet";
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
  down.disabled = index === state.labels.length - 1;
  down.innerHTML = '<i data-lucide="chevron-down"></i>';
  down.addEventListener("click", () => moveLabel(index, index + 1));
  movement.append(up, down);

  item.append(button, movement);
  return item;
}

function renderList() {
  const query = elements.searchInput.value.trim().toLowerCase();
  elements.labelList.replaceChildren();
  state.labels.forEach((label, index) => {
    const searchable = labelLines(label).join(" ").toLowerCase();
    if (!query || searchable.includes(query)) elements.labelList.append(createListItem(label, index));
  });

  if (!elements.labelList.children.length) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = state.labels.length ? "No labels match that search." : "Add a label or import an address list.";
    elements.labelList.append(empty);
  }
  createIcons({ icons: { ChevronDown, ChevronUp } });
}

function slotForSheet(slot) {
  const globalSlot = state.activeSheet * TEMPLATE.labelsPerSheet + slot;
  const recordIndex = globalSlot - (state.startSlot - 1);
  return recordIndex >= 0 ? { label: state.labels[recordIndex], recordIndex } : { label: null, recordIndex };
}

function createSheetSlot(slot) {
  const row = Math.floor(slot / TEMPLATE.columns);
  const column = slot % TEMPLATE.columns;
  const { label, recordIndex } = slotForSheet(slot);
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = "sheet-label";
  cell.style.left = `${TEMPLATE.leftMarginIn + (column * TEMPLATE.horizontalPitchIn)}in`;
  cell.style.top = `${TEMPLATE.topMarginIn + (row * TEMPLATE.verticalPitchIn)}in`;
  cell.style.width = `${TEMPLATE.labelWidthIn}in`;
  cell.style.height = `${TEMPLATE.labelHeightIn}in`;
  cell.setAttribute("aria-label", label ? `Edit ${label.name || `label ${recordIndex + 1}`}` : `Empty slot ${slot + 1}`);

  const slotNumber = document.createElement("span");
  slotNumber.className = "slot-number";
  slotNumber.textContent = String(slot + 1);
  cell.append(slotNumber);

  if (!label) {
    cell.classList.add("empty");
    cell.disabled = true;
    return cell;
  }

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
  cell.addEventListener("click", () => selectLabel(label.id, false));
  return cell;
}

function renderSheet() {
  const totalSheets = sheetCount(state);
  state.activeSheet = Math.min(Math.max(0, state.activeSheet), totalSheets - 1);
  elements.sheetCanvas.replaceChildren(...Array.from({ length: TEMPLATE.labelsPerSheet }, (_, slot) => createSheetSlot(slot)));
  elements.sheetCanvas.style.width = `${TEMPLATE.pageWidthIn}in`;
  elements.sheetCanvas.style.height = `${TEMPLATE.pageHeightIn}in`;
  elements.sheetCanvas.style.transform = `scale(${state.zoom / 100})`;
  elements.sheetStage.style.setProperty("--sheet-scale", String(state.zoom / 100));
  elements.sheetPosition.textContent = `Sheet ${state.activeSheet + 1} of ${totalSheets}`;
  elements.previousSheetButton.disabled = state.activeSheet === 0;
  elements.nextSheetButton.disabled = state.activeSheet >= totalSheets - 1;
}

function fillEditor(label) {
  const fields = ["name", "address1", "address2", "city", "state", "postal", "country"];
  fields.forEach((field) => {
    elements[`${field}Input`].value = label[field];
  });
  elements.fontSizeInput.value = label.fontSize;
  elements.lineHeightInput.value = label.lineHeight;
  elements.alignmentControl.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("selected", button.dataset.align === label.align);
  });
  const index = selectedIndex();
  const position = labelPosition(index, state.startSlot);
  elements.selectedPosition.textContent = `Label ${index + 1} · Sheet ${position.sheet + 1}, position ${position.slot + 1}`;
}

function renderInspector() {
  const label = selectedLabel();
  elements.emptyInspector.classList.toggle("hidden", Boolean(label));
  elements.editorInspector.classList.toggle("hidden", !label);
  if (label) fillEditor(label);
}

function renderMeta() {
  const totalSheets = sheetCount(state);
  elements.projectName.value = state.projectName;
  elements.labelCount.textContent = `${state.labels.length} label${state.labels.length === 1 ? "" : "s"}`;
  elements.sheetCount.textContent = `${totalSheets} sheet${totalSheets === 1 ? "" : "s"}`;
  elements.startSlotInput.value = state.startSlot;
  elements.zoomInput.value = state.zoom;
}

function render() {
  renderMeta();
  renderList();
  renderSheet();
  renderInspector();
}

function addLabel(label = blankLabel()) {
  state.labels.push(label);
  state.selectedId = label.id;
  state.activeSheet = labelPosition(state.labels.length - 1, state.startSlot).sheet;
  render();
  scheduleSave();
}

function moveLabel(from, to) {
  if (to < 0 || to >= state.labels.length || from === to) return;
  const [label] = state.labels.splice(from, 1);
  state.labels.splice(to, 0, label);
  state.activeSheet = labelPosition(to, state.startSlot).sheet;
  render();
  scheduleSave();
}

function deleteSelected() {
  const index = selectedIndex();
  if (index < 0) return;
  const [removed] = state.labels.splice(index, 1);
  state.selectedId = state.labels[Math.min(index, state.labels.length - 1)]?.id || null;
  render();
  scheduleSave();
  showToast(`${removed.name || "Label"} removed`);
}

function duplicateSelected() {
  const index = selectedIndex();
  const current = selectedLabel();
  if (!current) return;
  const duplicate = blankLabel({ ...current, id: undefined });
  state.labels.splice(index + 1, 0, duplicate);
  state.selectedId = duplicate.id;
  state.activeSheet = labelPosition(index + 1, state.startSlot).sheet;
  render();
  scheduleSave();
  showToast("Label duplicated");
}

function updateSelectedFromForm() {
  const label = selectedLabel();
  if (!label) return;
  ["name", "address1", "address2", "city", "state", "postal", "country"].forEach((field) => {
    label[field] = elements[`${field}Input`].value.trimStart();
  });
  label.fontSize = Math.min(14, Math.max(7, Number(elements.fontSizeInput.value) || 10));
  label.lineHeight = Math.min(1.6, Math.max(1, Number(elements.lineHeightInput.value) || 1.15));
  renderList();
  renderSheet();
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
    state.labels.push(...labels);
    state.selectedId = labels[0].id;
    state.activeSheet = labelPosition(state.labels.length - labels.length, state.startSlot).sheet;
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
  const blob = new Blob([labelsToCsv(state.labels)], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  const safeName = state.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "labeloo";
  link.href = URL.createObjectURL(blob);
  link.download = `${safeName}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("CSV exported");
}

elements.addLabelButton.addEventListener("click", () => addLabel());
elements.pasteAddressesButton.addEventListener("click", () => showImportDialog("paste"));
elements.importButton.addEventListener("click", () => showImportDialog("paste"));
elements.closeImportButton.addEventListener("click", () => elements.importDialog.close());
elements.confirmImportButton.addEventListener("click", importLabels);
elements.exportButton.addEventListener("click", exportCsv);
elements.printButton.addEventListener("click", async () => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Allow popups to open the print sheet");
    return;
  }
  printWindow.opener = null;
  printWindow.document.title = "Preparing labels...";
  printWindow.document.body.textContent = "Preparing your label sheet...";
  await saveWorkspace(state);
  printWindow.location.replace("print.html");
});
elements.searchInput.addEventListener("input", renderList);
elements.projectName.addEventListener("input", () => {
  state.projectName = elements.projectName.value;
  scheduleSave();
});
elements.startSlotInput.addEventListener("change", () => {
  state.startSlot = Math.min(30, Math.max(1, Number(elements.startSlotInput.value) || 1));
  state.activeSheet = 0;
  render();
  scheduleSave();
});
elements.zoomInput.addEventListener("input", () => {
  state.zoom = Number(elements.zoomInput.value);
  renderSheet();
  scheduleSave();
});
elements.previousSheetButton.addEventListener("click", () => {
  state.activeSheet -= 1;
  renderSheet();
  scheduleSave();
});
elements.nextSheetButton.addEventListener("click", () => {
  state.activeSheet += 1;
  renderSheet();
  scheduleSave();
});
elements.deleteLabelButton.addEventListener("click", deleteSelected);
elements.duplicateLabelButton.addEventListener("click", duplicateSelected);
elements.labelForm.addEventListener("input", updateSelectedFromForm);
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

render();
scheduleSave();
