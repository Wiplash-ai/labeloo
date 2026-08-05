import { TEMPLATE, activeSheet, labelLines, labelPosition, sheetCount } from "./model.js";
import { loadWorkspace } from "./storage.js";

const state = await loadWorkspace();
const sheet = activeSheet(state);
const sheets = document.getElementById("printSheets");
document.getElementById("printProjectName").textContent = state.projectName || "Labeloo";

for (let sheetIndex = 0; sheetIndex < sheetCount(sheet); sheetIndex += 1) {
  const page = document.createElement("section");
  page.className = "print-sheet";
  sheet.labels.forEach((label, index) => {
    const position = labelPosition(index, sheet.startSlot);
    if (position.sheet !== sheetIndex) return;
    const row = Math.floor(position.slot / TEMPLATE.columns);
    const column = position.slot % TEMPLATE.columns;
    const cell = document.createElement("div");
    cell.className = `print-label align-${label.align}`;
    cell.style.left = `${TEMPLATE.leftMarginIn + (column * TEMPLATE.horizontalPitchIn)}in`;
    cell.style.top = `${TEMPLATE.topMarginIn + (row * TEMPLATE.verticalPitchIn)}in`;
    cell.style.width = `${TEMPLATE.labelWidthIn}in`;
    cell.style.height = `${TEMPLATE.labelHeightIn}in`;
    cell.style.fontSize = `${label.fontSize}pt`;
    cell.style.lineHeight = String(label.lineHeight);
    labelLines(label).forEach((line) => {
      const lineNode = document.createElement("span");
      lineNode.textContent = line;
      cell.append(lineNode);
    });
    page.append(cell);
  });
  sheets.append(page);
}

document.getElementById("printNowButton").addEventListener("click", () => window.print());
