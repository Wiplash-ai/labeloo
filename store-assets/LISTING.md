# Labeloo Store Listing

## Name

Address & Shipping Label Maker - Labeloo

## Short description

Create and print address, shipping, name badge, and custom labels from text or popular spreadsheets on Avery-compatible US Letter sheets.

## Search terms

- `address label maker`
- `shipping label maker`
- `print labels`
- `label sheet printer`
- `CSV labels`
- `name badge maker`
- `US Letter labels`

## Opening description

Create print-ready address and shipping labels from selected webpage text, pasted lists, Excel, Apple Numbers, LibreOffice Calc, CSV, TSV, or Google Sheets. Shared-link Sheets work without an account; signed-in users can choose one private Google Sheet without granting blanket Drive access. Labeloo supports address, shipping, return-address, name-badge, email, and custom labels across 13 verified rectangular US Letter layouts.

Capture selected text from the browser context menu, reuse partially consumed sheets, map unfamiliar spreadsheet columns into Labeloo fields, preview the resulting records, follow duplicate-text references, organize multiple named sheets, preview exact label placement, and print at 100% scale or save as PDF. Labeloo works locally without an account. Wiplash.ai sign-in unlocks private Drive selection; project sync remains a separate opt-in.

## Category

Tools

## Permissions

- `storage` keeps sheets, labels, preferences, and optional sync state in extension storage.
- `contextMenus` adds the user-triggered “Add selection to Labeloo” command for highlighted text.
- `identity` opens Wiplash.ai in the browser-owned sign-in window and returns a one-time PKCE code. Labeloo does not request the browser profile's email address.
- Optional `https://auth.wiplash.ai/*` access is requested only when the user starts Wiplash.ai sign-in, private Drive selection, or first-party project sync.
- Optional `https://docs.google.com/*` access is requested only when the user chooses to import a public or anyone-with-link Google Sheet.

Labeloo requests no tabs, history, scripting, clipboard, or broad website access. Localhost development origins are not included in store packages.

## Compatibility note

Labeloo supports listed Avery product numbers and compatible equivalent stock. Labeloo is not affiliated with or endorsed by Avery Products Corporation.
