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
  HardDrive,
  Info,
  Link2,
  LogIn,
  MousePointer2,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Trash2,
  X,
  createIcons
} from "lucide";
import { labelsToCsv } from "./csv.js";
import {
  LABEL_TYPES,
  MAX_FONT_SIZE,
  MAX_LINE_HEIGHT,
  MIN_FONT_SIZE,
  MIN_LINE_HEIGHT,
  TEMPLATES,
  activeSheet,
  blankLabel,
  blankSheet,
  duplicateLabelGroups,
  labelHasContent,
  labelLines,
  labelPosition,
  getTemplate,
  insertLabelsIntoBlankSlots,
  parseAddressBlocks,
  parseQuickLabel,
  sanitizeWorkspace,
  sheetCount,
  validateLabel
} from "./model.js";
import {
  IMPORT_FIELDS,
  MAX_LABELS_PER_SHEET,
  autoMapping,
  columnDescriptors,
  createImportPlan,
  googleSheetExportUrl,
  labelsFromTable,
  orientedRows,
  readSpreadsheetBytes,
  readSpreadsheetFile
} from "./spreadsheet.js";
import { loadWorkspace, saveWorkspace, takePendingSelection } from "./storage.js";
import {
  chooseGoogleDriveSheet,
  loadAccount,
  logout,
  pullWorkspace,
  pushWorkspace,
  refreshAccount,
  signIn
} from "./sync.js";

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
  HardDrive,
  Info,
  Link2,
  LogIn,
  MousePointer2,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
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

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

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
  "zoomValue",
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
  "duplicateSummary",
  "duplicateLinks",
  "importDialog",
  "closeImportButton",
  "pastePanel",
  "spreadsheetPanel",
  "pasteInput",
  "spreadsheetChooser",
  "spreadsheetInput",
  "googleSheetToggle",
  "googleSheetImport",
  "googleSheetUrl",
  "googleSheetButton",
  "googleDriveImport",
  "googleDriveButton",
  "googleDriveButtonLabel",
  "googleDriveStatus",
  "googleDriveSwitchButton",
  "spreadsheetSetup",
  "spreadsheetFileName",
  "spreadsheetDimensions",
  "replaceSpreadsheetButton",
  "workbookSheetSelect",
  "headerAxisLabel",
  "dataAxisLabel",
  "headerRowSelect",
  "firstDataRowSelect",
  "mappingCount",
  "columnMapping",
  "importPreviewCount",
  "importPreviewList",
  "importMessage",
  "confirmImportButton",
  "confirmImportLabel",
  "toast",
  "accountDialog", "closeAccountButton", "signedOutAccount", "signedInAccount",
  "accountSubmit", "accountMigrationNote", "accountUserName", "accountUserEmail", "cloudProjectStatus",
  "conflictActions", "useCloudButton", "keepLocalButton", "syncNowButton", "syncNowLabel", "logoutButton",
  "accountMessage", "printPortal", "sheetDialog", "sheetDialogTitle", "sheetNameInput",
  "sheetTypeInput", "sheetAlignmentControl", "sheetFontSizeInput", "sheetLineHeightInput", "resetSheetTypographyButton",
  "deleteSheetButton", "saveSheetButton", "replaceLabelDialog",
  "replaceLabelMessage", "closeReplaceLabelButton", "cancelReplaceLabelButton", "confirmReplaceLabelButton"
].map((id) => [id, document.getElementById(id)]));

let state = await loadWorkspace();
let activeImportTab = "spreadsheet";
let importedWorkbook = null;
let importedSheetIndex = 0;
let spreadsheetPlan = null;
let spreadsheetLabels = [];
let saveTimer = null;
let toastTimer = null;
let cloudTimer = null;
let account = await loadAccount();
let accountReady = false;
let sheetDialogMode = "create";
let pendingLabelCopy = null;
let draggedLabelId = null;

const currentSheet = () => activeSheet(state);
const currentLabels = () => currentSheet().labels;
const currentTemplate = () => getTemplate(currentSheet().templateId);
let labelMeasureContext = null;

function clamp(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function maxFontSizeForLabel(label, sheet = currentSheet(), lineHeight = label.lineHeight) {
  const template = getTemplate(sheet.templateId);
  const lines = labelLines(label);
  const safeLineHeight = clamp(lineHeight, MIN_LINE_HEIGHT, MAX_LINE_HEIGHT, 1.15);
  const availableWidthPx = Math.max(1, (template.labelWidthIn - 0.26) * 96);
  const availableHeightPt = Math.max(1, (template.labelHeightIn - 0.18) * 72);
  const maxByHeight = availableHeightPt / (Math.max(1, lines.length) * safeLineHeight);
  let maxByWidth = MAX_FONT_SIZE;
  if (lines.length && globalThis.document) {
    labelMeasureContext ||= document.createElement("canvas").getContext("2d");
    if (labelMeasureContext) {
      labelMeasureContext.font = '100pt "Trebuchet MS", "Avenir Next", sans-serif';
      const widest = Math.max(...lines.map((line) => labelMeasureContext.measureText(line).width), 1);
      maxByWidth = 100 * (availableWidthPx / widest);
    }
  }
  return Math.max(MIN_FONT_SIZE, Math.floor(Math.min(MAX_FONT_SIZE, maxByHeight, maxByWidth) * 2) / 2);
}

function maxFontSizeForSheet(sheet = currentSheet(), lineHeight = sheet.defaultLineHeight) {
  const populated = sheet.labels.filter(labelHasContent);
  if (!populated.length) {
    return maxFontSizeForLabel(blankLabelForSheet(sheet), sheet, lineHeight);
  }
  return Math.min(...populated.map((label) => maxFontSizeForLabel(label, sheet, lineHeight)));
}

function applySheetTypography(label, sheet = currentSheet()) {
  label.align = sheet.defaultAlign;
  label.fontSize = sheet.defaultFontSize;
  label.lineHeight = sheet.defaultLineHeight;
  return label;
}

function syncNumberStepper(input) {
  const stepper = input?.closest(".number-stepper");
  if (!stepper) return;
  const value = Number(input.value);
  const minimum = Number(input.min);
  const maximum = Number(input.max);
  const down = stepper.querySelector('[data-step-direction="down"]');
  const up = stepper.querySelector('[data-step-direction="up"]');
  if (down) down.disabled = Number.isFinite(value) && Number.isFinite(minimum) && value <= minimum;
  if (up) up.disabled = Number.isFinite(value) && Number.isFinite(maximum) && value >= maximum;
}

function blankLabelForSheet(sheet = currentSheet(), overrides = {}) {
  return blankLabel({
    type: sheet.defaultType,
    align: sheet.defaultAlign,
    fontSize: sheet.defaultFontSize,
    lineHeight: sheet.defaultLineHeight,
    ...overrides
  });
}

if (!state.selectedId && currentLabels()[0]) state.selectedId = currentLabels()[0].id;

const pendingSelection = await takePendingSelection();
if (pendingSelection) {
  const captured = parseQuickLabel(pendingSelection.type, pendingSelection.value);
  if (captured) {
    applySheetTypography(captured);
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
    if (accountReady && account.user && account.syncEnabled && account.capabilities.projectSync && !account.conflict) {
      clearTimeout(cloudTimer);
      cloudTimer = setTimeout(() => syncToCloud(), 850);
    }
  }, 220);
}

function renderAccount() {
  const signedIn = Boolean(account.user);
  elements.accountButtonLabel.textContent = signedIn ? "Account" : "Sign in";
  elements.signedOutAccount.classList.toggle("hidden", signedIn);
  elements.signedInAccount.classList.toggle("hidden", !signedIn);
  elements.accountMigrationNote.classList.toggle("hidden", !account.legacyAccountDetected);
  elements.conflictActions.classList.toggle("hidden", !account.conflict);
  if (signedIn) {
    elements.accountUserName.textContent = account.user.name;
    elements.accountUserEmail.textContent = account.user.email;
    elements.cloudProjectStatus.textContent = account.conflict
      ? "Needs your choice"
      : account.syncEnabled && account.projectId ? `Cloud revision ${account.revision}` : "Local only";
  }
  elements.syncNowButton.disabled = signedIn && !account.capabilities.projectSync;
  elements.syncNowLabel.textContent = account.syncEnabled ? "Sync now" : "Enable project sync";
  const driveAvailable = signedIn && account.capabilities.googleDrive;
  elements.googleDriveButton.disabled = signedIn && !driveAvailable;
  elements.googleDriveSwitchButton.classList.toggle("hidden", !driveAvailable);
  elements.googleDriveSwitchButton.disabled = !driveAvailable;
  elements.googleDriveButtonLabel.textContent = driveAvailable
    ? "Choose a Google Sheet"
    : signedIn ? "My Drive is unavailable" : "Sign in to use My Drive";
  const driveIcon = document.createElement("i");
  driveIcon.dataset.lucide = driveAvailable ? "hard-drive" : "log-in";
  elements.googleDriveButton.replaceChildren(driveIcon, elements.googleDriveButtonLabel);
  elements.googleDriveStatus.textContent = driveAvailable
    ? `Signed in as ${account.user.email}. Google shows the picker and only asks for access when needed.`
    : signedIn
      ? "Private Google Drive import has not been configured for this Labeloo environment."
      : "Sign in with Wiplash.ai to choose one private Google Sheet.";
  renderIcons();
}

function setAccountMessage(message, isError = false) {
  elements.accountMessage.textContent = message;
  elements.accountMessage.classList.toggle("error", isError);
}

async function syncToCloud(force = false, enable = false) {
  if (!account.user || !account.capabilities.projectSync || (!account.syncEnabled && !enable)) return;
  elements.saveState.textContent = "Syncing…";
  try {
    account = await pushWorkspace({ ...account, syncEnabled: true }, sanitizeWorkspace(state), force);
    elements.saveState.textContent = "Saved + synced";
    setAccountMessage("Project synced.");
  } catch (error) {
    account = error.account || account;
    elements.saveState.textContent = account.conflict ? "Sync needs review" : "Saved locally";
    setAccountMessage(error.message, true);
  }
  renderAccount();
}

function createLabelContent(label) {
  const content = document.createElement("span");
  content.className = `sheet-label-content align-${label.align}`;
  content.style.fontSize = `${label.fontSize}pt`;
  content.style.lineHeight = String(label.lineHeight);
  labelLines(label).forEach((line) => {
    const lineNode = document.createElement("span");
    lineNode.textContent = line;
    content.append(lineNode);
  });
  return content;
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
      cell.className = "print-label";
      const row = Math.floor(slot / selectedTemplate.columns);
      const column = slot % selectedTemplate.columns;
      cell.style.left = `${selectedTemplate.leftMarginIn + (column * selectedTemplate.horizontalPitchIn)}in`;
      cell.style.top = `${selectedTemplate.topMarginIn + (row * selectedTemplate.verticalPitchIn)}in`;
      cell.style.width = `${selectedTemplate.labelWidthIn}in`;
      cell.style.height = `${selectedTemplate.labelHeightIn}in`;
      if (label) cell.append(createLabelContent(label));
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
  while (sheet.labels.length < targetRecordIndex) sheet.labels.push(blankLabelForSheet(sheet));
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
  const lines = labelLines(label);
  const [primary, ...remaining] = lines;
  const title = document.createElement("strong");
  title.textContent = primary || `Empty ${LABEL_TYPES[label.type].label.toLowerCase()}`;
  const address = document.createElement("small");
  address.textContent = remaining.join(" · ") || (primary ? LABEL_TYPES[label.type].label : LABEL_TYPES[label.type].description);
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
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "mini-icon mini-icon--danger";
  remove.title = "Delete label";
  remove.setAttribute("aria-label", `Delete ${label.name || `label ${index + 1}`}`);
  remove.innerHTML = '<i data-lucide="trash-2"></i>';
  remove.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteLabelAt(index);
  });
  movement.append(up, down, remove);

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

function editEmptySlot(recordIndex) {
  if (recordIndex < 0) return;
  const sheet = currentSheet();
  while (sheet.labels.length <= recordIndex) {
    sheet.labels.push(blankLabelForSheet(sheet));
  }
  selectLabel(sheet.labels[recordIndex].id, false, true);
}

function createSheetSlot(slot, duplicateGroups) {
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
    if (recordIndex < 0) {
      cell.disabled = true;
      cell.setAttribute("aria-label", `Skipped slot ${slot + 1}`);
    } else {
      cell.addEventListener("click", () => editEmptySlot(recordIndex));
    }
  } else {
    const hasContent = labelHasContent(label);
    const duplicateIndexes = duplicateGroups.get(label.id) || [];
    cell.classList.toggle("empty", !hasContent);
    cell.draggable = hasContent;
    if (duplicateIndexes.length) {
      cell.classList.add("has-duplicate");
      slotNumber.classList.add("duplicate-reference");
      slotNumber.textContent = `#${recordIndex + 1}`;
      slotNumber.title = `Duplicate label text · reference ${recordIndex + 1}`;
      cell.setAttribute("aria-label", `${cell.getAttribute("aria-label")}, duplicate text, reference ${recordIndex + 1}`);
    }
    if (label.id === state.selectedId) cell.classList.add("selected");
    cell.append(createLabelContent(label));
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
  const duplicateGroups = duplicateLabelGroups(sheet.labels);
  const selectedTemplate = getTemplate(sheet.templateId);
  const totalSheets = sheetCount(sheet);
  sheet.activePage = Math.min(Math.max(0, sheet.activePage), totalSheets - 1);
  elements.sheetCanvas.replaceChildren(...Array.from({ length: selectedTemplate.labelsPerSheet }, (_, slot) => createSheetSlot(slot, duplicateGroups)));
  elements.sheetCanvas.style.width = `${selectedTemplate.pageWidthIn}in`;
  elements.sheetCanvas.style.height = `${selectedTemplate.pageHeightIn}in`;
  elements.sheetCanvas.style.transform = `scale(${state.zoom / 100})`;
  elements.sheetStage.style.setProperty("--sheet-scale", String(state.zoom / 100));
  elements.zoomInput.value = String(Math.round(state.zoom));
  elements.zoomValue.value = `${Math.round(state.zoom)}%`;
  elements.sheetPosition.textContent = `Page ${sheet.activePage + 1} of ${totalSheets}`;
  elements.previousSheetButton.disabled = sheet.activePage === 0;
  elements.nextSheetButton.disabled = sheet.activePage >= totalSheets - 1;
}

function renderDuplicateSummary(label) {
  const references = duplicateLabelGroups(currentLabels()).get(label.id) || [];
  elements.duplicateLinks.replaceChildren();
  elements.duplicateSummary.classList.toggle("hidden", !references.length);
  if (!references.length) return;
  references.forEach((index, referenceIndex) => {
    if (referenceIndex > 0) {
      const separator = document.createElement("span");
      separator.textContent = referenceIndex === references.length - 1 ? " and " : ", ";
      elements.duplicateLinks.append(separator);
    }
    const duplicate = currentLabels()[index];
    const link = document.createElement("button");
    link.type = "button";
    link.textContent = `label #${index + 1}`;
    link.title = `Select duplicate label ${index + 1}`;
    link.addEventListener("click", () => selectLabel(duplicate.id));
    elements.duplicateLinks.append(link);
  });
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
  renderDuplicateSummary(label);
  ["name", "email", "customText", "address1", "city", "state", "postal"].forEach((field) => {
    const error = document.getElementById(`${field}Error`);
    const input = elements[`${field}Input`];
    if (!error || !input) return;
    error.textContent = validation.errors[field] || "";
    input.setAttribute("aria-invalid", validation.errors[field] ? "true" : "false");
  });
  elements.fontSizeInput.value = label.fontSize;
  elements.fontSizeInput.max = String(maxFontSizeForLabel(label));
  elements.lineHeightInput.value = label.lineHeight;
  syncNumberStepper(elements.fontSizeInput);
  syncNumberStepper(elements.lineHeightInput);
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
  const nextLabel = label ? applySheetTypography(label, sheet) : blankLabelForSheet(sheet);
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

function deleteLabelAt(index) {
  if (index < 0) return;
  const labels = currentLabels();
  if (index >= labels.length) return;
  const [removed] = labels.splice(index, 1);
  if (removed.id === state.selectedId) {
    state.selectedId = labels[Math.min(index, labels.length - 1)]?.id || null;
  }
  render();
  scheduleSave();
  showToast(`${removed.name || "Label"} removed`);
}

function deleteSelected() {
  deleteLabelAt(selectedIndex());
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
  label.lineHeight = clamp(elements.lineHeightInput.value, MIN_LINE_HEIGHT, MAX_LINE_HEIGHT, 1.15);
  label.fontSize = clamp(elements.fontSizeInput.value, MIN_FONT_SIZE, maxFontSizeForLabel(label, currentSheet(), label.lineHeight), 10);
  renderList();
  renderSheet();
  fillEditor(label);
  scheduleSave();
}

function showImportDialog(tab = "spreadsheet") {
  setImportTab(tab);
  elements.importMessage.textContent = "";
  elements.importDialog.showModal();
  setTimeout(() => (tab === "paste" ? elements.pasteInput : elements.spreadsheetInput).focus(), 0);
}

function setImportTab(tab) {
  activeImportTab = tab === "spreadsheet" ? "spreadsheet" : "paste";
  document.querySelectorAll("[data-import-tab]").forEach((button) => {
    const selected = button.dataset.importTab === activeImportTab;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  elements.pastePanel.classList.toggle("hidden", activeImportTab !== "paste");
  elements.spreadsheetPanel.classList.toggle("hidden", activeImportTab !== "spreadsheet");
  elements.confirmImportLabel.textContent = activeImportTab === "spreadsheet" && spreadsheetLabels.length
    ? `Add ${spreadsheetLabels.length} label${spreadsheetLabels.length === 1 ? "" : "s"}`
    : "Add labels";
  elements.confirmImportButton.disabled = activeImportTab === "spreadsheet" && !spreadsheetLabels.length;
}

function activeWorkbookSheet() {
  return importedWorkbook?.sheets?.[importedSheetIndex] || null;
}

function rowSummary(row) {
  const values = (row || []).filter(Boolean).slice(0, 3).join(" · ");
  return values.length > 56 ? `${values.slice(0, 53)}…` : values;
}

function replaceOptions(select, options, selectedValue) {
  select.replaceChildren(...options.map(({ value, label }) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = label;
    return option;
  }));
  select.value = String(selectedValue);
}

function setGoogleSheetImporterExpanded(expanded) {
  elements.googleSheetToggle.setAttribute("aria-expanded", String(expanded));
  elements.googleSheetImport.classList.toggle("hidden", !expanded);
  if (expanded) queueMicrotask(() => elements.googleSheetUrl.focus());
}

function renderSpreadsheetPreview(rows) {
  elements.importPreviewList.replaceChildren();
  elements.importMessage.textContent = "";
  try {
    spreadsheetLabels = labelsFromTable(rows, spreadsheetPlan, MAX_LABELS_PER_SHEET);
    const remaining = MAX_LABELS_PER_SHEET - currentLabels().filter(labelHasContent).length;
    if (spreadsheetLabels.length > remaining) {
      throw new Error(`This sheet has room for ${remaining} more label${remaining === 1 ? "" : "s"}.`);
    }
    spreadsheetLabels.slice(0, 5).forEach((label, index) => {
      const item = document.createElement("article");
      const number = document.createElement("span");
      number.className = "preview-number";
      number.textContent = String(index + 1).padStart(2, "0");
      const content = document.createElement("div");
      const lines = labelLines(label);
      lines.slice(0, 5).forEach((line, lineIndex) => {
        const text = document.createElement(lineIndex === 0 ? "strong" : "span");
        text.textContent = line;
        content.append(text);
      });
      item.append(number, content);
      elements.importPreviewList.append(item);
    });
    if (spreadsheetLabels.length > 5) {
      const remainingNote = document.createElement("p");
      remainingNote.className = "preview-more";
      remainingNote.textContent = `+ ${spreadsheetLabels.length - 5} more ready to import`;
      elements.importPreviewList.append(remainingNote);
    }
    elements.importPreviewCount.textContent = `${spreadsheetLabels.length} ready`;
  } catch (error) {
    spreadsheetLabels = [];
    const empty = document.createElement("p");
    empty.className = "preview-empty";
    empty.textContent = error.message || "Map a field to preview your labels.";
    elements.importPreviewList.append(empty);
    elements.importPreviewCount.textContent = "0 ready";
  }
  elements.confirmImportButton.disabled = !spreadsheetLabels.length;
  elements.confirmImportLabel.textContent = spreadsheetLabels.length
    ? `Add ${spreadsheetLabels.length} label${spreadsheetLabels.length === 1 ? "" : "s"}`
    : "Add labels";
}

function renderColumnMapping(rows) {
  const columns = columnDescriptors(rows, spreadsheetPlan.headerRowIndex, spreadsheetPlan.firstDataRowIndex)
    .filter((column) => column.header || column.samples.length || spreadsheetPlan.mapping[column.index]);
  elements.columnMapping.replaceChildren();
  columns.forEach((column) => {
    const record = document.createElement("article");
    record.className = "column-map-row";
    const source = document.createElement("div");
    source.className = "source-column";
    const reference = document.createElement("span");
    reference.className = "column-reference";
    reference.textContent = column.reference;
    const sourceText = document.createElement("div");
    const heading = document.createElement("strong");
    heading.textContent = column.label;
    const sample = document.createElement("small");
    sample.textContent = column.samples.length ? column.samples.join(" · ") : "No sample values";
    sourceText.append(heading, sample);
    source.append(reference, sourceText);

    const arrow = document.createElement("span");
    arrow.className = "mapping-arrow";
    arrow.textContent = "→";
    arrow.setAttribute("aria-hidden", "true");

    const destination = document.createElement("label");
    destination.className = "mapping-destination";
    const destinationLabel = document.createElement("span");
    destinationLabel.textContent = "Place in";
    const select = document.createElement("select");
    select.setAttribute("aria-label", `Map ${column.label}`);
    IMPORT_FIELDS.forEach((field) => {
      const option = document.createElement("option");
      option.value = field.value;
      option.textContent = field.label;
      select.append(option);
    });
    select.value = spreadsheetPlan.mapping[column.index] || "";
    select.addEventListener("change", () => {
      const nextField = select.value;
      if (nextField) {
        Object.keys(spreadsheetPlan.mapping).forEach((sourceIndex) => {
          if (sourceIndex !== String(column.index) && spreadsheetPlan.mapping[sourceIndex] === nextField) {
            spreadsheetPlan.mapping[sourceIndex] = "";
          }
        });
      }
      spreadsheetPlan.mapping[column.index] = nextField;
      renderSpreadsheetMapping();
    });
    destination.append(destinationLabel, select);
    record.append(source, arrow, destination);
    elements.columnMapping.append(record);
  });
  const mappedCount = Object.values(spreadsheetPlan.mapping).filter(Boolean).length;
  elements.mappingCount.textContent = `${mappedCount} of ${columns.length} mapped`;
}

function renderSpreadsheetMapping() {
  const rows = orientedRows(activeWorkbookSheet(), spreadsheetPlan.orientation);
  renderColumnMapping(rows);
  renderSpreadsheetPreview(rows);
}

function renderSpreadsheetStructure() {
  const sheet = activeWorkbookSheet();
  if (!sheet || !spreadsheetPlan) return;
  const rows = orientedRows(sheet, spreadsheetPlan.orientation);
  const axis = spreadsheetPlan.orientation === "columns" ? "Column" : "Row";
  elements.headerAxisLabel.textContent = `Field names are in`;
  elements.dataAxisLabel.textContent = `First label is in`;
  const rowOptions = rows.slice(0, 100).map((row, index) => ({
    value: index,
    label: `${axis} ${index + 1}${rowSummary(row) ? ` · ${rowSummary(row)}` : " · empty"}`
  }));
  replaceOptions(elements.headerRowSelect, [
    { value: -1, label: `No header ${axis.toLowerCase()}` },
    ...rowOptions
  ], spreadsheetPlan.headerRowIndex);
  replaceOptions(elements.firstDataRowSelect, rowOptions, spreadsheetPlan.firstDataRowIndex);
  document.querySelectorAll("[data-import-orientation]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.importOrientation === spreadsheetPlan.orientation);
  });
  elements.spreadsheetDimensions.textContent = `${sheet.rows.length} rows · ${sheet.rows.reduce((maximum, row) => Math.max(maximum, row.length), 0)} columns`;
  renderSpreadsheetMapping();
}

function useImportedWorkbook(workbook) {
  importedWorkbook = workbook;
  importedSheetIndex = 0;
  spreadsheetPlan = createImportPlan(activeWorkbookSheet());
  elements.spreadsheetFileName.textContent = workbook.sourceName;
  replaceOptions(elements.workbookSheetSelect, workbook.sheets.map((sheet, index) => ({ value: index, label: sheet.name })), 0);
  elements.spreadsheetChooser.classList.add("hidden");
  elements.spreadsheetSetup.classList.remove("hidden");
  renderSpreadsheetStructure();
}

function resetSpreadsheetImport() {
  importedWorkbook = null;
  importedSheetIndex = 0;
  spreadsheetPlan = null;
  spreadsheetLabels = [];
  elements.spreadsheetInput.value = "";
  elements.googleSheetUrl.value = "";
  setGoogleSheetImporterExpanded(false);
  elements.spreadsheetChooser.classList.remove("hidden");
  elements.spreadsheetSetup.classList.add("hidden");
  elements.columnMapping.replaceChildren();
  elements.importPreviewList.replaceChildren();
  elements.confirmImportButton.disabled = true;
  elements.confirmImportLabel.textContent = "Add labels";
}

async function loadSpreadsheetFile(file) {
  elements.importMessage.textContent = "Reading spreadsheet…";
  elements.confirmImportButton.disabled = true;
  try {
    useImportedWorkbook(await readSpreadsheetFile(file));
    elements.importMessage.textContent = "";
  } catch (error) {
    elements.importMessage.textContent = error.message || "That spreadsheet could not be read.";
  }
}

const GOOGLE_SHEET_DOWNLOAD_MESSAGE = "Labeloo couldn’t download that sheet. In Google Sheets, choose Share → General access → Anyone with the link (Viewer), then try again. If it’s already shared, check your connection.";

async function loadGoogleSheet() {
  elements.importMessage.textContent = "";
  try {
    const exportUrl = googleSheetExportUrl(elements.googleSheetUrl.value);
    if (globalThis.chrome?.permissions?.request) {
      const granted = await chrome.permissions.request({ origins: ["https://docs.google.com/*"] });
      if (!granted) throw new Error("Google Sheets access was not granted.");
    }
    elements.googleSheetButton.disabled = true;
    elements.importMessage.textContent = "Loading Google Sheet…";
    const response = await fetch(exportUrl, { credentials: "omit", redirect: "follow" });
    if (!response.ok) throw new Error(GOOGLE_SHEET_DOWNLOAD_MESSAGE);
    const contentType = response.headers.get("content-type") || "";
    if (/text\/html/i.test(contentType)) throw new Error(GOOGLE_SHEET_DOWNLOAD_MESSAGE);
    useImportedWorkbook(readSpreadsheetBytes(await response.arrayBuffer(), "Google Sheet.xlsx"));
    elements.importMessage.textContent = "";
  } catch (error) {
    const message = error?.message || "";
    elements.importMessage.textContent = /failed to fetch|networkerror|load failed/i.test(message)
      ? GOOGLE_SHEET_DOWNLOAD_MESSAGE
      : message || "That Google Sheet could not be loaded.";
  } finally {
    elements.googleSheetButton.disabled = false;
  }
}

function showAccountDialog(message = "") {
  renderAccount();
  setAccountMessage(message);
  elements.accountDialog.showModal();
}

async function loadPrivateGoogleSheet({ chooseAccount = false } = {}) {
  if (!account.user) {
    elements.importDialog.close();
    showAccountDialog("Sign in with Wiplash.ai, then return here to choose a private Google Sheet.");
    return;
  }
  const extensionApp = /^(?:chrome|moz)-extension:$/.test(location.protocol);
  const preparedWindow = extensionApp ? null : window.open("about:blank", "labeloo-google-drive");
  if (preparedWindow) {
    preparedWindow.document.title = "Opening Google Drive…";
    preparedWindow.document.body.textContent = "Opening Google Drive…";
  }
  elements.googleDriveButton.disabled = true;
  elements.googleDriveSwitchButton.disabled = true;
  elements.importMessage.textContent = "Connecting to Google Drive…";
  try {
    const workbook = await chooseGoogleDriveSheet(account, {
      preparedWindow,
      chooseAccount,
      onStatus: (message) => { elements.importMessage.textContent = message; },
    });
    useImportedWorkbook(readSpreadsheetBytes(workbook.bytes, workbook.sourceName));
    elements.importMessage.textContent = "";
  } catch (error) {
    if (preparedWindow && !preparedWindow.closed) preparedWindow.close();
    elements.importMessage.textContent = error?.name === "AbortError"
      ? "Google Drive selection was cancelled."
      : error?.message || "That Google Sheet could not be loaded from Drive.";
  } finally {
    renderAccount();
  }
}

async function importLabels() {
  elements.importMessage.textContent = "";
  try {
    const labels = activeImportTab === "spreadsheet" ? spreadsheetLabels : parseAddressBlocks(elements.pasteInput.value);
    if (!labels.length) throw new Error("Add at least one complete address.");
    labels.forEach((label) => applySheetTypography(label));
    const inserted = insertLabelsIntoBlankSlots(currentLabels(), labels);
    state.selectedId = inserted[0].label.id;
    currentSheet().activePage = labelPosition(inserted[0].index, currentSheet().startSlot, currentSheet().templateId).sheet;
    elements.importDialog.close();
    elements.pasteInput.value = "";
    resetSpreadsheetImport();
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
  const defaultType = LABEL_TYPES[sheet.defaultType] ? sheet.defaultType : "address";
  elements.sheetDialogTitle.textContent = creating ? "Create another sheet" : "Sheet settings";
  elements.sheetNameInput.value = creating ? `${LABEL_TYPES[defaultType].label} sheet ${state.sheets.length + 1}` : sheet.name;
  elements.sheetTypeInput.value = defaultType;
  if (!elements.sheetTypeInput.value) elements.sheetTypeInput.selectedIndex = 0;
  elements.sheetFontSizeInput.value = sheet.defaultFontSize;
  elements.sheetLineHeightInput.value = sheet.defaultLineHeight;
  elements.sheetFontSizeInput.max = String(creating
    ? maxFontSizeForLabel(blankLabelForSheet(sheet), sheet, sheet.defaultLineHeight)
    : maxFontSizeForSheet(sheet, sheet.defaultLineHeight));
  syncNumberStepper(elements.sheetFontSizeInput);
  syncNumberStepper(elements.sheetLineHeightInput);
  elements.sheetAlignmentControl.querySelectorAll("button[data-align]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.align === sheet.defaultAlign);
  });
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
  const defaultAlign = elements.sheetAlignmentControl.querySelector("button.selected")?.dataset.align === "center" ? "center" : "left";
  const defaultLineHeight = clamp(elements.sheetLineHeightInput.value, MIN_LINE_HEIGHT, MAX_LINE_HEIGHT, 1.15);
  const fontLimit = sheetDialogMode === "create"
    ? maxFontSizeForLabel(blankLabelForSheet(currentSheet()), currentSheet(), defaultLineHeight)
    : maxFontSizeForSheet(currentSheet(), defaultLineHeight);
  const defaultFontSize = clamp(elements.sheetFontSizeInput.value, MIN_FONT_SIZE, fontLimit, 10);
  if (sheetDialogMode === "create") {
    const sheet = blankSheet({ name, defaultType: elements.sheetTypeInput.value, defaultAlign, defaultFontSize, defaultLineHeight });
    const first = blankLabelForSheet(sheet);
    sheet.labels.push(first);
    state.sheets.push(sheet);
    state.activeSheetId = sheet.id;
    state.selectedId = first.id;
    showToast("New sheet created");
  } else {
    const sheet = currentSheet();
    sheet.name = name;
    sheet.defaultType = elements.sheetTypeInput.value;
    sheet.defaultAlign = defaultAlign;
    sheet.defaultFontSize = defaultFontSize;
    sheet.defaultLineHeight = defaultLineHeight;
    sheet.labels.forEach((label) => applySheetTypography(label, sheet));
    showToast(`Formatting applied to ${sheet.labels.length} label${sheet.labels.length === 1 ? "" : "s"}`);
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
elements.importButton.addEventListener("click", () => showImportDialog("spreadsheet"));
elements.closeImportButton.addEventListener("click", () => elements.importDialog.close());
elements.confirmImportButton.addEventListener("click", importLabels);
elements.exportButton.addEventListener("click", exportCsv);
elements.printButton.addEventListener("click", printLabels);
window.addEventListener("afterprint", () => {
  elements.printPortal.replaceChildren();
  elements.printPortal.setAttribute("aria-hidden", "true");
});
elements.accountButton.addEventListener("click", () => showAccountDialog());
elements.closeAccountButton.addEventListener("click", () => elements.accountDialog.close());
elements.accountSubmit.addEventListener("click", async () => {
  setAccountMessage("Opening Wiplash.ai…");
  elements.accountSubmit.disabled = true;
  try {
    account = await signIn(account, (message) => setAccountMessage(message));
    accountReady = true;
    renderAccount();
    if (account.user) showToast("Wiplash.ai account connected");
  } catch (error) {
    setAccountMessage(error.message, true);
  } finally {
    elements.accountSubmit.disabled = false;
  }
});
elements.syncNowButton.addEventListener("click", () => syncToCloud(false, true));
elements.logoutButton.addEventListener("click", async () => {
  account = await logout(account);
  renderAccount();
  elements.accountDialog.close();
  elements.saveState.textContent = "Saved locally";
  showToast("Signed out. Local labels were kept.");
});
elements.useCloudButton.addEventListener("click", async () => {
  try {
    const cloud = await pullWorkspace(account);
    state = sanitizeWorkspace(cloud.workspace);
    account = cloud.account;
    await saveWorkspace(state);
    render();
    renderAccount();
    showToast("Cloud copy loaded");
  } catch (error) { setAccountMessage(error.message, true); }
});
elements.keepLocalButton.addEventListener("click", () => syncToCloud(true, true));
elements.searchInput.addEventListener("input", renderList);
elements.sheetSelect.addEventListener("change", () => switchSheet(elements.sheetSelect.value));
elements.addSheetButton.addEventListener("click", () => openSheetDialog("create"));
elements.sheetMenuButton.addEventListener("click", () => openSheetDialog("edit"));
elements.saveSheetButton.addEventListener("click", saveSheetSettings);
elements.sheetAlignmentControl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-align]");
  if (!button) return;
  elements.sheetAlignmentControl.querySelectorAll("button[data-align]").forEach((item) => item.classList.toggle("selected", item === button));
});
elements.resetSheetTypographyButton.addEventListener("click", () => {
  elements.sheetAlignmentControl.querySelectorAll("button[data-align]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.align === "left");
  });
  elements.sheetFontSizeInput.value = "10";
  elements.sheetLineHeightInput.value = "1.15";
  elements.sheetFontSizeInput.max = String(sheetDialogMode === "create"
    ? maxFontSizeForLabel(blankLabelForSheet(currentSheet()), currentSheet(), 1.15)
    : maxFontSizeForSheet(currentSheet(), 1.15));
  syncNumberStepper(elements.sheetFontSizeInput);
  syncNumberStepper(elements.sheetLineHeightInput);
  elements.resetSheetTypographyButton.blur();
});
elements.sheetLineHeightInput.addEventListener("input", () => {
  const lineHeight = clamp(elements.sheetLineHeightInput.value, MIN_LINE_HEIGHT, MAX_LINE_HEIGHT, 1.15);
  elements.sheetFontSizeInput.max = String(maxFontSizeForSheet(currentSheet(), lineHeight));
  syncNumberStepper(elements.sheetFontSizeInput);
  syncNumberStepper(elements.sheetLineHeightInput);
});
document.querySelectorAll("[data-step-target]").forEach((button) => button.addEventListener("click", () => {
  const input = document.getElementById(button.dataset.stepTarget);
  if (!input) return;
  if (button.dataset.stepDirection === "up") input.stepUp();
  else input.stepDown();
  input.focus({ preventScroll: true });
  input.dispatchEvent(new Event("input", { bubbles: true }));
  syncNumberStepper(input);
}));
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
function setZoom(nextZoom) {
  const minimum = Number(elements.zoomInput.min) || 65;
  const maximum = Number(elements.zoomInput.max) || 115;
  const clampedZoom = Math.min(maximum, Math.max(minimum, Math.round(nextZoom)));
  if (clampedZoom === state.zoom) return;
  state.zoom = clampedZoom;
  renderSheet();
  scheduleSave();
}

elements.zoomInput.addEventListener("input", () => {
  setZoom(Number(elements.zoomInput.value));
});

let pendingWheelZoom = 0;
let wheelZoomFrame = null;
elements.sheetStage.addEventListener("wheel", (event) => {
  if (!event.deltaY) return;
  event.preventDefault();
  event.stopPropagation();
  pendingWheelZoom += event.deltaY;
  if (wheelZoomFrame) return;
  wheelZoomFrame = requestAnimationFrame(() => {
    if (pendingWheelZoom !== 0) setZoom(state.zoom + (pendingWheelZoom < 0 ? 4 : -4));
    pendingWheelZoom = 0;
    wheelZoomFrame = null;
  });
}, { capture: true, passive: false });
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
const importTabButtons = [...document.querySelectorAll("[data-import-tab]")];
importTabButtons.forEach((button, index) => {
  button.addEventListener("click", () => setImportTab(button.dataset.importTab));
  button.addEventListener("keydown", (event) => {
    let nextIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % importTabButtons.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + importTabButtons.length) % importTabButtons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = importTabButtons.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextButton = importTabButtons[nextIndex];
    setImportTab(nextButton.dataset.importTab);
    nextButton.focus();
  });
});
elements.spreadsheetInput.addEventListener("change", () => {
  const file = elements.spreadsheetInput.files?.[0];
  if (file) loadSpreadsheetFile(file);
});
elements.googleSheetToggle.addEventListener("click", () => {
  setGoogleSheetImporterExpanded(elements.googleSheetToggle.getAttribute("aria-expanded") !== "true");
});
elements.googleDriveButton.addEventListener("click", () => loadPrivateGoogleSheet());
elements.googleDriveSwitchButton.addEventListener("click", () => loadPrivateGoogleSheet({ chooseAccount: true }));
elements.googleSheetButton.addEventListener("click", loadGoogleSheet);
elements.googleSheetUrl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  loadGoogleSheet();
});
elements.replaceSpreadsheetButton.addEventListener("click", resetSpreadsheetImport);
elements.workbookSheetSelect.addEventListener("change", () => {
  importedSheetIndex = Number(elements.workbookSheetSelect.value) || 0;
  spreadsheetPlan = createImportPlan(activeWorkbookSheet());
  renderSpreadsheetStructure();
});
document.querySelectorAll("[data-import-orientation]").forEach((button) => {
  button.addEventListener("click", () => {
    spreadsheetPlan = createImportPlan(activeWorkbookSheet(), button.dataset.importOrientation);
    renderSpreadsheetStructure();
  });
});
elements.headerRowSelect.addEventListener("change", () => {
  const rows = orientedRows(activeWorkbookSheet(), spreadsheetPlan.orientation);
  spreadsheetPlan.headerRowIndex = Number(elements.headerRowSelect.value);
  if (spreadsheetPlan.headerRowIndex >= spreadsheetPlan.firstDataRowIndex) {
    spreadsheetPlan.firstDataRowIndex = Math.min(rows.length - 1, spreadsheetPlan.headerRowIndex + 1);
  }
  spreadsheetPlan.mapping = autoMapping(rows, spreadsheetPlan.headerRowIndex, spreadsheetPlan.firstDataRowIndex);
  renderSpreadsheetStructure();
});
elements.firstDataRowSelect.addEventListener("change", () => {
  spreadsheetPlan.firstDataRowIndex = Number(elements.firstDataRowSelect.value) || 0;
  renderSpreadsheetMapping();
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
refreshAccount(account).then((nextAccount) => {
  account = nextAccount;
  accountReady = true;
  renderAccount();
  if (account.user && account.syncEnabled) scheduleSave();
}).catch(() => {
  accountReady = true;
  renderAccount();
});
