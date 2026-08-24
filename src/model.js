export const STORAGE_KEY = "labelooWorkspaceV2";
export const MIN_FONT_SIZE = 4;
export const MAX_FONT_SIZE = 240;
export const MIN_LINE_HEIGHT = 0.8;
export const MAX_LINE_HEIGHT = 3;
export const MIN_ZOOM = 65;
export const MAX_ZOOM = 300;

const template = (config) => Object.freeze({
  pageWidthIn: 8.5,
  pageHeightIn: 11,
  ...config,
  labelsPerSheet: config.columns * config.rows
});

export const TEMPLATES = Object.freeze([
  template({ id: "avery-5160-30", name: "Avery 5160", compatibility: "5160 / 8160 / 5260", columns: 3, rows: 10, labelWidthIn: 2.625, labelHeightIn: 1, leftMarginIn: 0.1875, topMarginIn: 0.5, horizontalPitchIn: 2.75, verticalPitchIn: 1 }),
  template({ id: "avery-5161-20", name: "Avery 5161", compatibility: "5161 / 8161 / 5261", columns: 2, rows: 10, labelWidthIn: 4, labelHeightIn: 1, leftMarginIn: 1 / 6, topMarginIn: 0.5, horizontalPitchIn: 4.188205, verticalPitchIn: 1 }),
  template({ id: "avery-5162-14", name: "Avery 5162", compatibility: "5162 / 8162 / 5262", columns: 2, rows: 7, labelWidthIn: 4, labelHeightIn: 4 / 3, leftMarginIn: 0.155545, topMarginIn: 0.832628, horizontalPitchIn: 4.1875, verticalPitchIn: 4 / 3 }),
  template({ id: "avery-5163-10", name: "Avery 5163", compatibility: "5163 / 8163 / 5263", columns: 2, rows: 5, labelWidthIn: 4, labelHeightIn: 2, leftMarginIn: 0.155545, topMarginIn: 0.5, horizontalPitchIn: 4.188205, verticalPitchIn: 2 }),
  template({ id: "avery-5164-6", name: "Avery 5164", compatibility: "5164 / 8164", columns: 2, rows: 3, labelWidthIn: 4, labelHeightIn: 10 / 3, leftMarginIn: 0.155545, topMarginIn: 0.5, horizontalPitchIn: 4.188205, verticalPitchIn: 3.332628 }),
  template({ id: "avery-5167-80", name: "Avery 5167", compatibility: "5167 / 8167", columns: 4, rows: 20, labelWidthIn: 1.75, labelHeightIn: 0.5, leftMarginIn: 0.300022, topMarginIn: 0.5, horizontalPitchIn: 2.049968, verticalPitchIn: 0.5 }),
  template({ id: "avery-5195-60", name: "Avery 5195", compatibility: "5195 / 8195", columns: 4, rows: 15, labelWidthIn: 1.75, labelHeightIn: 0.66, leftMarginIn: 0.300022, topMarginIn: 0.550022, horizontalPitchIn: 2.049968, verticalPitchIn: 0.659722 }),
  template({ id: "avery-5168-4", name: "Avery 5168", compatibility: "5168 / 8168", columns: 2, rows: 2, labelWidthIn: 3.5, labelHeightIn: 5, leftMarginIn: 0.5, topMarginIn: 0.5, horizontalPitchIn: 4, verticalPitchIn: 5 }),
  template({ id: "avery-5126-2", name: "Avery 5126", compatibility: "5126 / 8126", columns: 1, rows: 2, labelWidthIn: 8.5, labelHeightIn: 5.5, leftMarginIn: 0, topMarginIn: 0, horizontalPitchIn: 8.5, verticalPitchIn: 5.5 }),
  template({ id: "avery-5165-1", name: "Avery 5165", compatibility: "5165 / 8165", columns: 1, rows: 1, labelWidthIn: 8.5, labelHeightIn: 11, leftMarginIn: 0, topMarginIn: 0, horizontalPitchIn: 8.5, verticalPitchIn: 11 }),
  template({ id: "avery-5395-8", name: "Avery 5395", compatibility: "5395 / 8395 name badges", columns: 2, rows: 4, labelWidthIn: 3.375, labelHeightIn: 2.333008, leftMarginIn: 0.6875, topMarginIn: 0.5625, horizontalPitchIn: 3.75, verticalPitchIn: 2.520128 }),
  template({ id: "avery-5390-8", name: "Avery 5390", compatibility: "5390 / 8390 name badges", columns: 2, rows: 4, labelWidthIn: 3.5, labelHeightIn: 2.21875, leftMarginIn: 0.75, topMarginIn: 1.0625, horizontalPitchIn: 3.5, verticalPitchIn: 2.21875 }),
  template({ id: "avery-5392-6", name: "Avery 5392", compatibility: "5392 / 8392 name badges", columns: 2, rows: 3, labelWidthIn: 4, labelHeightIn: 3, leftMarginIn: 0.25, topMarginIn: 1, horizontalPitchIn: 4, verticalPitchIn: 3 })
]);

const TEMPLATE_BY_ID = new Map(TEMPLATES.map((item) => [item.id, item]));
TEMPLATE_BY_ID.set("address-30", TEMPLATES[0]);
TEMPLATE_BY_ID.set("avery-8160-30", TEMPLATES[0]);
TEMPLATE_BY_ID.set("avery-5260-30", TEMPLATES[0]);

export const TEMPLATE = TEMPLATES[0];

export function getTemplate(templateId) {
  return TEMPLATE_BY_ID.get(templateId) || TEMPLATE;
}

export const LABEL_TYPES = Object.freeze({
  address: { label: "Address", description: "Recipient and postal address" },
  name: { label: "Name tag", description: "Name and role or organization" },
  email: { label: "Email", description: "Name and email address" },
  custom: { label: "Custom", description: "Up to five lines of your own text" }
});

const uid = (prefix = "label") => globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const text = (value, max) => String(value ?? "").trim().slice(0, max);

export function blankLabel(overrides = {}) {
  const label = {
    id: uid(),
    type: "address",
    name: "",
    subtitle: "",
    email: "",
    customText: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postal: "",
    country: "",
    align: "left",
    fontSize: 10,
    lineHeight: 1.15,
    ...overrides
  };
  if (!label.id) label.id = uid();
  if (!LABEL_TYPES[label.type]) label.type = "address";
  return label;
}

export function blankSheet(overrides = {}) {
  const type = LABEL_TYPES[overrides.defaultType] ? overrides.defaultType : "address";
  const fontSize = Number(overrides.defaultFontSize);
  const lineHeight = Number(overrides.defaultLineHeight);
  return {
    id: overrides.id || uid("sheet"),
    name: text(overrides.name || `${LABEL_TYPES[type].label} sheet`, 60),
    startSlot: 1,
    activePage: 0,
    labels: [],
    ...overrides,
    defaultType: type,
    defaultAlign: overrides.defaultAlign === "center" ? "center" : "left",
    defaultFontSize: Number.isFinite(fontSize) ? Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, fontSize)) : 10,
    defaultLineHeight: Number.isFinite(lineHeight) ? Math.min(MAX_LINE_HEIGHT, Math.max(MIN_LINE_HEIGHT, lineHeight)) : 1.15,
    templateId: getTemplate(overrides.templateId).id
  };
}

export function sampleWorkspace() {
  const sheet = blankSheet({
    name: "Address sheet",
    labels: [
      blankLabel({ name: "Alex Rivera", address1: "123 Splash Lane", city: "Fort Worth", state: "TX", postal: "76102" }),
      blankLabel({ name: "Wiplash Labs", address1: "44 Signal Street", address2: "Suite 8", city: "Austin", state: "TX", postal: "78701" }),
      blankLabel({ name: "Sample Recipient", address1: "18 Paper Trail", city: "Denver", state: "CO", postal: "80202" })
    ]
  });
  return {
    version: 2,
    clientId: uid("workspace"),
    projectName: "My label collection",
    zoom: 86,
    activeSheetId: sheet.id,
    selectedId: sheet.labels[0]?.id || null,
    sheets: [sheet]
  };
}

export function sanitizeLabel(raw = {}) {
  const fontSize = Number(raw.fontSize);
  const lineHeight = Number(raw.lineHeight);
  return blankLabel({
    id: typeof raw.id === "string" && raw.id ? raw.id : uid(),
    type: LABEL_TYPES[raw.type] ? raw.type : "address",
    name: text(raw.name, 120),
    subtitle: text(raw.subtitle, 120),
    email: text(raw.email, 254),
    customText: text(raw.customText, 600),
    address1: text(raw.address1, 120),
    address2: text(raw.address2, 120),
    city: text(raw.city, 80),
    state: text(raw.state, 40),
    postal: text(raw.postal, 20),
    country: text(raw.country, 80),
    align: raw.align === "center" ? "center" : "left",
    fontSize: Number.isFinite(fontSize) ? Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, fontSize)) : 10,
    lineHeight: Number.isFinite(lineHeight) ? Math.min(MAX_LINE_HEIGHT, Math.max(MIN_LINE_HEIGHT, lineHeight)) : 1.15
  });
}

export function sanitizeSheet(raw = {}, index = 0) {
  const labels = Array.isArray(raw.labels) ? raw.labels.slice(0, 2000).map(sanitizeLabel) : [];
  const startSlot = Number(raw.startSlot);
  const activePage = Number(raw.activePage ?? raw.activeSheet);
  const defaultType = LABEL_TYPES[raw.defaultType] ? raw.defaultType : labels[0]?.type || "address";
  const defaultFontSize = Number(raw.defaultFontSize ?? labels[0]?.fontSize);
  const defaultLineHeight = Number(raw.defaultLineHeight ?? labels[0]?.lineHeight);
  const selectedTemplate = getTemplate(raw.templateId);
  return blankSheet({
    id: typeof raw.id === "string" && raw.id ? raw.id : uid("sheet"),
    name: text(raw.name || `Sheet ${index + 1}`, 60),
    defaultType,
    defaultAlign: raw.defaultAlign === "center" || (!raw.defaultAlign && labels[0]?.align === "center") ? "center" : "left",
    defaultFontSize,
    defaultLineHeight,
    templateId: selectedTemplate.id,
    startSlot: Number.isInteger(startSlot) ? Math.min(selectedTemplate.labelsPerSheet, Math.max(1, startSlot)) : 1,
    activePage: Number.isInteger(activePage) ? Math.max(0, activePage) : 0,
    labels
  });
}

export function sanitizeWorkspace(raw) {
  if (!raw || typeof raw !== "object") return sampleWorkspace();
  const legacySheet = raw.sheets ? null : sanitizeSheet({
    name: raw.projectName || "Address sheet",
    labels: raw.labels,
    startSlot: raw.startSlot,
    activeSheet: raw.activeSheet
  });
  const sheets = legacySheet
    ? [legacySheet]
    : raw.sheets.slice(0, 100).map(sanitizeSheet);
  if (!sheets.length) sheets.push(blankSheet({ name: "Address sheet" }));
  const activeSheetId = sheets.some((sheet) => sheet.id === raw.activeSheetId) ? raw.activeSheetId : sheets[0].id;
  const allLabels = sheets.flatMap((sheet) => sheet.labels);
  const selectedId = allLabels.some((label) => label.id === raw.selectedId) ? raw.selectedId : sheets.find((sheet) => sheet.id === activeSheetId)?.labels[0]?.id || null;
  const zoom = Number(raw.zoom);
  return {
    version: 2,
    clientId: typeof raw.clientId === "string" && raw.clientId.length >= 8 ? raw.clientId.slice(0, 80) : uid("workspace"),
    // Retained in the saved payload for backward compatibility. The UI names individual sheets.
    projectName: text(raw.projectName || "My label collection", 80),
    zoom: Number.isFinite(zoom) ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) : 86,
    activeSheetId,
    selectedId,
    sheets
  };
}

export function activeSheet(workspace) {
  return workspace.sheets.find((sheet) => sheet.id === workspace.activeSheetId) || workspace.sheets[0];
}

export function labelLines(label) {
  if (label.type === "name") return [label.name, label.subtitle].filter(Boolean);
  if (label.type === "email") return [label.name, label.email].filter(Boolean);
  if (label.type === "custom") {
    return String(label.customText || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5);
  }
  const locality = [label.city, label.state].filter(Boolean).join(", ");
  const cityLine = [locality, label.postal].filter(Boolean).join(" ");
  return [label.name, label.address1, label.address2, cityLine, label.country].filter(Boolean);
}

export function labelHasContent(label) {
  return labelLines(label).some((line) => line.trim());
}

export function insertLabelsIntoBlankSlots(labels, incomingLabels) {
  const inserted = [];
  let searchFrom = 0;
  for (const incoming of incomingLabels) {
    let blankIndex = -1;
    for (let index = searchFrom; index < labels.length; index += 1) {
      if (!labelHasContent(labels[index])) {
        blankIndex = index;
        break;
      }
    }
    if (blankIndex >= 0) {
      const replacement = blankLabel({ ...incoming, id: labels[blankIndex].id });
      labels[blankIndex] = replacement;
      inserted.push({ label: replacement, index: blankIndex });
      searchFrom = blankIndex + 1;
    } else {
      labels.push(incoming);
      inserted.push({ label: incoming, index: labels.length - 1 });
      searchFrom = labels.length;
    }
  }
  return inserted;
}

function duplicateTextKey(label) {
  return labelLines(label)
    .map((line) => line.trim().replace(/\s+/g, " ").toLocaleLowerCase())
    .filter(Boolean)
    .join("\n");
}

export function duplicateLabelGroups(labels) {
  const groupsByText = new Map();
  labels.forEach((label, index) => {
    const key = duplicateTextKey(label);
    if (!key) return;
    const group = groupsByText.get(key) || [];
    group.push(index);
    groupsByText.set(key, group);
  });
  const references = new Map();
  groupsByText.forEach((indexes) => {
    if (indexes.length < 2) return;
    indexes.forEach((index) => references.set(labels[index].id, indexes.filter((otherIndex) => otherIndex !== index)));
  });
  return references;
}

export function validateLabel(label) {
  const errors = {};
  if (label.type === "name") {
    if (!label.name) errors.name = "Add the name that should appear on the tag.";
  } else if (label.type === "email") {
    if (!label.email) errors.email = "Add an email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(label.email)) errors.email = "Enter an email address such as name@example.com.";
  } else if (label.type === "custom") {
    if (!labelLines(label).length) errors.customText = "Add at least one line of label text.";
  } else {
    if (!label.name) errors.name = "Add a recipient or organization.";
    if (!label.address1) errors.address1 = "Add a street or delivery address.";
    if (!label.city) errors.city = "Add a city.";
    if (!label.state) errors.state = "Add a state, province, or region.";
    if (!label.postal) errors.postal = "Add a ZIP or postal code.";
    else if ((!label.country || /^(us|usa|united states)$/i.test(label.country)) && !/^\d{5}(?:-\d{4})?$/.test(label.postal)) {
      errors.postal = "Use a 5-digit ZIP or ZIP+4 for a U.S. address.";
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function sheetCount(sheet) {
  const selectedTemplate = getTemplate(sheet.templateId);
  return Math.max(1, Math.ceil(((sheet.startSlot - 1) + sheet.labels.length) / selectedTemplate.labelsPerSheet));
}

export function printablePageIndexes(sheet) {
  const pages = new Set();
  sheet.labels.forEach((label, index) => {
    if (labelHasContent(label)) pages.add(labelPosition(index, sheet.startSlot, sheet.templateId).sheet);
  });
  return [...pages].sort((left, right) => left - right);
}

export function labelPosition(index, startSlot, templateId = TEMPLATE.id) {
  const selectedTemplate = getTemplate(templateId);
  const globalSlot = (startSlot - 1) + index;
  return { sheet: Math.floor(globalSlot / selectedTemplate.labelsPerSheet), slot: globalSlot % selectedTemplate.labelsPerSheet };
}

export function parseAddressBlock(value) {
  const lines = String(value ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  const localityPattern = /^(.*?)(?:,\s*|\s+)([A-Za-z]{2})(?:\s+)([A-Za-z0-9][A-Za-z0-9 -]{2,11})$/;
  const localityIndex = lines.findIndex((line, index) => index > 0 && localityPattern.test(line));
  const localityMatch = localityIndex >= 0 ? lines[localityIndex].match(localityPattern) : null;
  const addressLines = localityIndex >= 0 ? lines.slice(1, localityIndex) : lines.slice(1);
  return blankLabel({
    type: "address",
    name: lines[0] || "",
    address1: addressLines[0] || "",
    address2: addressLines.slice(1).join(", "),
    city: localityMatch?.[1]?.trim() || "",
    state: localityMatch?.[2]?.toUpperCase() || "",
    postal: localityMatch?.[3]?.trim() || "",
    country: localityIndex >= 0 ? lines[localityIndex + 1] || "" : ""
  });
}

export function parseQuickLabel(type, value) {
  const lines = String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  if (type === "address") return parseAddressBlock(value);
  if (type === "name") return blankLabel({ type, name: lines[0], subtitle: lines.slice(1).join(" · ") });
  if (type === "email") {
    const emailIndex = lines.findIndex((line) => line.includes("@"));
    return blankLabel({ type, name: emailIndex > 0 ? lines.slice(0, emailIndex).join(" ") : "", email: lines[emailIndex >= 0 ? emailIndex : 0] || "" });
  }
  return blankLabel({ type: "custom", customText: lines.slice(0, 5).join("\n") });
}

export function parseAddressBlocks(value) {
  return String(value ?? "").trim().split(/\r?\n\s*\r?\n+/).map(parseAddressBlock).filter(Boolean);
}
