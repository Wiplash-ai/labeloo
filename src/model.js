export const STORAGE_KEY = "labelooWorkspaceV1";

export const TEMPLATE = Object.freeze({
  id: "address-30",
  name: "30-up address",
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

const uid = () => globalThis.crypto?.randomUUID?.() ?? `label-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function blankLabel(overrides = {}) {
  const label = {
    id: uid(),
    name: "",
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
  return label;
}

export function sampleWorkspace() {
  return {
    version: 1,
    projectName: "My label sheet",
    templateId: TEMPLATE.id,
    startSlot: 1,
    zoom: 86,
    activeSheet: 0,
    selectedId: null,
    labels: [
      blankLabel({
        name: "Alex Rivera",
        address1: "123 Splash Lane",
        city: "Fort Worth",
        state: "TX",
        postal: "76102"
      }),
      blankLabel({
        name: "Wiplash Labs",
        address1: "44 Signal Street",
        address2: "Suite 8",
        city: "Austin",
        state: "TX",
        postal: "78701"
      }),
      blankLabel({
        name: "Sample Recipient",
        address1: "18 Paper Trail",
        city: "Denver",
        state: "CO",
        postal: "80202"
      })
    ]
  };
}

export function sanitizeLabel(raw = {}) {
  const text = (key, max) => String(raw[key] ?? "").trim().slice(0, max);
  const fontSize = Number(raw.fontSize);
  const lineHeight = Number(raw.lineHeight);
  return blankLabel({
    id: typeof raw.id === "string" && raw.id ? raw.id : uid(),
    name: text("name", 120),
    address1: text("address1", 120),
    address2: text("address2", 120),
    city: text("city", 80),
    state: text("state", 40),
    postal: text("postal", 20),
    country: text("country", 80),
    align: raw.align === "center" ? "center" : "left",
    fontSize: Number.isFinite(fontSize) ? Math.min(14, Math.max(7, fontSize)) : 10,
    lineHeight: Number.isFinite(lineHeight) ? Math.min(1.6, Math.max(1, lineHeight)) : 1.15
  });
}

export function sanitizeWorkspace(raw) {
  if (!raw || typeof raw !== "object") return sampleWorkspace();
  const labels = Array.isArray(raw.labels) ? raw.labels.slice(0, 2000).map(sanitizeLabel) : [];
  const startSlot = Number(raw.startSlot);
  const zoom = Number(raw.zoom);
  const activeSheet = Number(raw.activeSheet);
  const selectedId = labels.some((label) => label.id === raw.selectedId) ? raw.selectedId : null;
  return {
    version: 1,
    projectName: String(raw.projectName || "My label sheet").trim().slice(0, 80),
    templateId: TEMPLATE.id,
    startSlot: Number.isInteger(startSlot) ? Math.min(30, Math.max(1, startSlot)) : 1,
    zoom: Number.isFinite(zoom) ? Math.min(115, Math.max(65, zoom)) : 86,
    activeSheet: Number.isInteger(activeSheet) ? Math.max(0, activeSheet) : 0,
    selectedId,
    labels
  };
}

export function labelLines(label) {
  const locality = [label.city, label.state].filter(Boolean).join(", ");
  const cityLine = [locality, label.postal].filter(Boolean).join(" ");
  return [label.name, label.address1, label.address2, cityLine, label.country].filter(Boolean);
}

export function sheetCount(workspace) {
  return Math.max(1, Math.ceil(((workspace.startSlot - 1) + workspace.labels.length) / TEMPLATE.labelsPerSheet));
}

export function labelPosition(index, startSlot) {
  const globalSlot = (startSlot - 1) + index;
  return {
    sheet: Math.floor(globalSlot / TEMPLATE.labelsPerSheet),
    slot: globalSlot % TEMPLATE.labelsPerSheet
  };
}

export function parseAddressBlock(text) {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  const localityPattern = /^(.*?)(?:,\s*|\s+)([A-Za-z]{2})(?:\s+)([A-Za-z0-9][A-Za-z0-9 -]{2,11})$/;
  const localityIndex = lines.findIndex((line, index) => index > 0 && localityPattern.test(line));
  const localityMatch = localityIndex >= 0 ? lines[localityIndex].match(localityPattern) : null;
  const addressLines = localityIndex >= 0 ? lines.slice(1, localityIndex) : lines.slice(1);

  return blankLabel({
    name: lines[0] || "",
    address1: addressLines[0] || "",
    address2: addressLines.slice(1).join(", "),
    city: localityMatch?.[1]?.trim() || "",
    state: localityMatch?.[2]?.toUpperCase() || "",
    postal: localityMatch?.[3]?.trim() || "",
    country: localityIndex >= 0 ? lines[localityIndex + 1] || "" : ""
  });
}

export function parseAddressBlocks(text) {
  return String(text ?? "")
    .trim()
    .split(/\r?\n\s*\r?\n+/)
    .map(parseAddressBlock)
    .filter(Boolean);
}
