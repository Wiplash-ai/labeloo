import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  .find((candidate) => existsSync(candidate));
const pdfinfo = ["/usr/bin/pdfinfo", "/usr/local/bin/pdfinfo"]
  .find((candidate) => existsSync(candidate));
const pdftotext = ["/usr/bin/pdftotext", "/usr/local/bin/pdftotext"]
  .find((candidate) => existsSync(candidate));

function pageMarkup(index) {
  return `<section class="print-sheet" style="--print-page-width:8.5in;--print-page-height:11in;--print-flow-width:calc(8.5in - 1px);--print-flow-height:calc(11in - 1px)">
    <div class="print-label" style="inset:0;width:8.5in;height:11in">
      <strong style="position:absolute;top:0.5in;left:0.5in">Physical page ${index}</strong>
      <span style="position:absolute;right:0.25in;bottom:0.25in">Bottom edge ${index}</span>
    </div>
  </section>`;
}

function defaultSampleMarkup() {
  const labels = [0, 1, 2].map((column) => `<div class="print-label" style="left:${0.1875 + (column * 2.75)}in;top:0.5in;width:2.625in;height:1in">Sample ${column + 1}</div>`).join("");
  return `<section class="print-sheet" style="--print-page-width:8.5in;--print-page-height:11in;--print-flow-width:8.3125in;--print-flow-height:1.5in">${labels}</section>`;
}

async function renderPdf({ cssPath, body, forbiddenText, name, tempDirectory }) {
  const css = await readFile(new URL(cssPath, root), "utf8");
  const htmlPath = join(tempDirectory, `${name}.html`);
  const pdfPath = join(tempDirectory, `${name}.pdf`);
  await writeFile(htmlPath, `<!doctype html><meta charset="utf-8"><style>${css}</style>${body}`);
  const result = spawnSync(chrome, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--user-data-dir=${join(tempDirectory, `${name}-profile`)}`,
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href
  ], { encoding: "utf8", timeout: 30_000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const metadata = spawnSync(pdfinfo, [pdfPath], { encoding: "utf8", timeout: 10_000 });
  assert.equal(metadata.status, 0, metadata.stderr || metadata.stdout);
  if (forbiddenText && pdftotext) {
    const textOutput = spawnSync(pdftotext, [pdfPath, "-"], { encoding: "utf8", timeout: 10_000 });
    assert.equal(textOutput.status, 0, textOutput.stderr || textOutput.stdout);
    assert.doesNotMatch(textOutput.stdout, forbiddenText);
  }
  return metadata.stdout;
}

test("two populated sheets render as exactly two physical PDF pages", {
  skip: !chrome || !pdfinfo
}, async (context) => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "labeloo-print-pagination-"));
  context.after(() => rm(tempDirectory, { recursive: true, force: true }));

  const pages = `${pageMarkup(1)}${pageMarkup(2)}`;
  const inlineMetadata = await renderPdf({
    cssPath: "src/app.css",
    body: `<div class="print-portal">${pages}</div>`,
    name: "inline-print",
    tempDirectory
  });
  const standaloneMetadata = await renderPdf({
    cssPath: "src/print.css",
    body: `<main id="printSheets">${pages}</main>`,
    name: "standalone-print",
    tempDirectory
  });

  assert.match(inlineMetadata, /^Pages:\s+2$/m);
  assert.match(standaloneMetadata, /^Pages:\s+2$/m);
});

test("the three-label default sample renders as one physical PDF page", {
  skip: !chrome || !pdfinfo
}, async (context) => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "labeloo-default-print-pagination-"));
  context.after(() => rm(tempDirectory, { recursive: true, force: true }));

  const page = defaultSampleMarkup();
  const inlineMetadata = await renderPdf({
    cssPath: "src/app.css",
    body: `<nav class="skip-links"><a href="#labels">Jump to labels</a><a href="#preview">Jump to preview</a><a href="#editor">Jump to editor</a></nav><div class="print-portal">${page}</div>`,
    forbiddenText: /Jump to (?:labels|preview|editor)/,
    name: "inline-default-print",
    tempDirectory
  });
  const standaloneMetadata = await renderPdf({
    cssPath: "src/print.css",
    body: `<main id="printSheets">${page}</main>`,
    name: "standalone-default-print",
    tempDirectory
  });

  assert.match(inlineMetadata, /^Pages:\s+1$/m);
  assert.match(standaloneMetadata, /^Pages:\s+1$/m);
});
