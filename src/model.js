export const STORAGE_KEY = "labelooWorkspaceV2";

export const TEMPLATE = Object.freeze({
  id: "avery-5160-30",
  name: "Avery 5160 address labels",
  compatibility: "Avery 5160 / 8160 / 5260 compatible",
  pageWidthIn: 8.5,
  pageHeightIn: 11,
  columns: 3,
  rows: 10,
  labelWidthIn: 2.625,
  labelHeightIn: 1,
  leftMarginIn: 0.1875,
  topMarginIn: 0.5,
  horizontalPitchIn: 2.75,
  verticalPitchIn: 1,
  labelsPerSheet: 30
});

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
  return {
    id: overrides.id || uid("sheet"),
    name: text(overrides.name || `${LABEL_TYPES[type].label} sheet`, 60),
    defaultType: type,
    templateId: TEMPLATE.id,
    startSlot: 1,
    activePage: 0,
    labels: [],
    ...overrides
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
    fontSize: Number.isFinite(fontSize) ? Math.min(14, Math.max(7, fontSize)) : 10,
    lineHeight: Number.isFinite(lineHeight) ? Math.min(1.6, Math.max(1, lineHeight)) : 1.15
  });
}

export function sanitizeSheet(raw = {}, index = 0) {
  const labels = Array.isArray(raw.labels) ? raw.labels.slice(0, 2000).map(sanitizeLabel) : [];
  const startSlot = Number(raw.startSlot);
  const activePage = Number(raw.activePage ?? raw.activeSheet);
  const defaultType = LABEL_TYPES[raw.defaultType] ? raw.defaultType : labels[0]?.type || "address";
  return blankSheet({
    id: typeof raw.id === "string" && raw.id ? raw.id : uid("sheet"),
    name: text(raw.name || `Sheet ${index + 1}`, 60),
    defaultType,
    templateId: TEMPLATE.id,
    startSlot: Number.isInteger(startSlot) ? Math.min(30, Math.max(1, startSlot)) : 1,
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
    projectName: text(raw.projectName || "My label collection", 80),
    zoom: Number.isFinite(zoom) ? Math.min(115, Math.max(65, zoom)) : 86,
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
  return Math.max(1, Math.ceil(((sheet.startSlot - 1) + sheet.labels.length) / TEMPLATE.labelsPerSheet));
}

export function labelPosition(index, startSlot) {
  const globalSlot = (startSlot - 1) + index;
  return { sheet: Math.floor(globalSlot / TEMPLATE.labelsPerSheet), slot: globalSlot % TEMPLATE.labelsPerSheet };
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
