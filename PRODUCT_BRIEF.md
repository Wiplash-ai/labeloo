# Labeloo Product Brief

## Purpose

Labeloo turns names and postal addresses into print-ready label sheets without
requiring a spreadsheet template, account, or remote service. The browser
extension adds a useful browser-native action: send selected address text from
any ordinary webpage directly into the current Labeloo sheet.

## V1 Scope

- Local-first browser application and Manifest V3 extension.
- Thirteen rectangular US Letter stock families spanning address, shipping,
  return-address, full-sheet, half-sheet, and name-badge layouts.
- Add, edit, duplicate, reorder, and remove labels.
- Start printing at any position supported by the selected stock so partially used sheets can
  be reused.
- Import pasted address blocks and CSV files.
- Capture selected webpage text from the browser context menu.
- Auto-save projects in browser storage.
- Export project data as CSV.
- Print with exact physical dimensions or use the browser's Save as PDF flow.
- Chrome, Edge, Opera, and Firefox packaging.

## Product Boundaries

- No account, analytics, backend, advertising, remote fonts, or CDN.
- No address validation or postal-service API in V1.
- No shipping-label purchase or postage generation.
- No personal data from the legacy church-label project is copied into this
  repository.

## Visual Direction

Labeloo should feel like a precise print workbench rather than office software:
bright paper, deep charcoal controls, teal registration marks, and restrained
gold highlights. The printable sheet is the visual focus. Controls stay compact
and predictable so people can repeatedly prepare labels without relearning the
interface.
