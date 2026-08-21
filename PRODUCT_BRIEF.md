# Labeloo Product Brief

## Purpose

Labeloo turns names, addresses, email contacts, and custom text into print-ready
label sheets without requiring a spreadsheet template or account. The browser
extension adds a useful browser-native action: send selected address text from
any ordinary webpage directly into the current Labeloo sheet.

## V1 Scope

- Local-first browser application and Manifest V3 extension.
- Thirteen rectangular US Letter stock families spanning address, shipping,
  return-address, full-sheet, half-sheet, and name-badge layouts.
- Add, edit, duplicate, reorder, and remove labels.
- Start printing at any position supported by the selected stock so partially used sheets can
  be reused.
- Import pasted address blocks, Excel workbooks, Apple Numbers files,
  LibreOffice Calc files, CSV, TSV, and text lists through a field-mapping
  workbench with sheet, orientation, header, data-start, and preview controls.
- Import public or anyone-with-link Google Sheets after a user explicitly grants
  the optional Google Sheets host permission.
- Let Wiplash.ai-signed-in users choose one private Google Sheet with Google's
  per-file Picker authorization; do not request broad Drive access.
- Reuse editable blank records during import and flag duplicate printed text with
  proofing references that link matching labels in the editor.
- Capture selected webpage text from the browser context menu.
- Auto-save projects in browser storage.
- Export project data as CSV.
- Print with exact physical dimensions or use the browser's Save as PDF flow.
- Chrome, Edge, Opera, and Firefox packaging.
- Wiplash.ai single sign-on and separately enabled, revision-safe project sync
  across browsers.
- Commercial import and PDF-rendering API using the same 13-template catalog.

## Product Boundaries

- No account is required for local editing, importing, exporting, or printing.
- Signing in does not automatically enable cloud project sync or authorize
  Google Drive.
- No analytics, advertising, remote fonts, or CDN in the editor.
- No address validation or postal-service API in V1.
- No shipping-label purchase or postage generation.
- No personal data from the legacy church-label project is copied into this
  repository.

## Next Version Backlog

Labeloo v0.6.0 targets non-standard stock: square, round, oval, and business
card layouts. Each layout must pass geometry, browser PDF, and physical print
calibration before it is advertised as supported.

## Visual Direction

Labeloo should feel like a precise print workbench rather than office software:
bright paper, deep charcoal controls, teal registration marks, and restrained
gold highlights. The printable sheet is the visual focus. Controls stay compact
and predictable so people can repeatedly prepare labels without relearning the
interface.
