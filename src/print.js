import { activeSheet, getTemplate, labelHasContent, labelLines, labelPosition, printablePageIndexes } from "./model.js";
import { loadWorkspace } from "./storage.js";

const state = await loadWorkspace();
const sheet = activeSheet(state);
const template = getTemplate(sheet.templateId);
const sheets = document.getElementById("printSheets");
const printButton = document.getElementById("printNowButton");
const printablePages = printablePageIndexes(sheet);
document.getElementById("printProjectName").textContent = sheet.name || "Labeloo";

for (const sheetIndex of printablePages) {
  const page = document.createElement("section");
  page.className = "print-sheet";
  sheet.labels.forEach((label, index) => {
    if (!labelHasContent(label)) return;
    const position = labelPosition(index, sheet.startSlot, sheet.templateId);
    if (position.sheet !== sheetIndex) return;
    const row = Math.floor(position.slot / template.columns);
    const column = position.slot % template.columns;
    const cell = document.createElement("div");
    cell.className = "print-label";
    cell.style.left = `${template.leftMarginIn + (column * template.horizontalPitchIn)}in`;
    cell.style.top = `${template.topMarginIn + (row * template.verticalPitchIn)}in`;
    cell.style.width = `${template.labelWidthIn}in`;
    cell.style.height = `${template.labelHeightIn}in`;
    const content = document.createElement("span");
    content.className = `print-label-content align-${label.align}`;
    content.style.fontSize = `${label.fontSize}pt`;
    content.style.lineHeight = String(label.lineHeight);
    labelLines(label).forEach((line) => {
      const lineNode = document.createElement("span");
      lineNode.textContent = line;
      content.append(lineNode);
    });
    cell.append(content);
    page.append(cell);
  });
  sheets.append(page);
}

if (!printablePages.length) {
  sheets.textContent = "Add label content before printing.";
  printButton.disabled = true;
}

printButton.addEventListener("click", () => window.print());
