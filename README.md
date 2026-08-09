<p align="center">
  <img src="src/assets/icons/icon128.png" alt="Labeloo name-tag icon" width="112">
</p>

# Labeloo

Labeloo is a local-first label sheet workbench and browser extension. Capture
text from a webpage or create address, name-tag, email, and custom labels, then
print them on common rectangular US Letter label stock.

## Features

- Browser context-menu capture for selected addresses.
- Quick-add extension popup with label-type selection.
- Exact previews for 13 common rectangular address, shipping, return-address,
  full-sheet, half-sheet, and name-badge stock families.
- Compatible layouts for Avery 5126, 5160, 5161, 5162, 5163, 5164, 5165,
  5167, 5168, 5195, 5390, 5392, and 5395 plus listed equivalents.
- Multiple named sheets in one local workspace.
- Type-aware completeness checks for names, email syntax, and US address fields.
- Reuse partially consumed sheets by selecting the first available position.
- Add, edit, duplicate, reorder, search, and delete labels.
- Click a physical label to edit it, drag a populated label into an empty slot,
  and confirm before replacing existing content.
- Zoom the sheet directly with the mouse wheel while the pointer is over the
  print preview.
- Paste address blocks or import CSV files with flexible column names.
- Browser-local auto-save and CSV export.
- Optional Labeloo account and revision-safe cross-device project sync.
- Print at 100% scale or use the browser's Save as PDF command.
- Chrome, Edge, Opera, Firefox, and standalone web builds.

Labeloo is local-first and works without an account. Label content is sent to
Wiplash only when a user explicitly signs in and enables project sync. Sync
keeps projects available across supported browsers and devices and detects
revision conflicts before overwriting a newer copy. Labeloo has no analytics
or advertising.

## Development

Requirements: Node.js 20+, npm, and `zip` for store archives.

```bash
npm install
npm test
npm run build
npm run dev
```

Review the web application at `http://127.0.0.1:4186`.

Load the extension from:

- Chrome: `dist/chrome`
- Edge: `dist/edge`
- Opera: `dist/opera`
- Firefox: `dist/firefox/manifest.json`

Create all store archives with:

```bash
npm run package:stores
```

## Privacy and permissions

- `storage` keeps the current project and pending selected address locally.
- `contextMenus` adds “Add selection to Labeloo” when text is selected.
- Sync service access is an optional host permission requested only when a user
  signs in. Editing, importing, exporting, and printing do not require it.

Address labels manufactured by Avery are referenced solely for compatibility.
Labeloo is not affiliated with or endorsed by Avery Products Corporation.
Address validation checks formatting and completeness only; it does not confirm
that an address is deliverable.

## Supported stock catalog

| Use | Canonical stock | Listed equivalents | Labels per sheet |
| --- | --- | --- | ---: |
| Address | 5160, 5161, 5162 | 5260-series and 8160-series equivalents | 14, 20, 30 |
| Shipping | 5163, 5164, 5168 | 5263, 8163, 8164, 8168 | 4, 6, 10 |
| Return address | 5167, 5195 | 8167, 8195 | 60, 80 |
| Sheet | 5126, 5165 | 8126, 8165 | 1, 2 |
| Name badge | 5390, 5392, 5395 | 8390, 8392, 8395 | 6, 8 |

The next release target is specialty and non-standard stock. See the
[Specialty Label Template Roadmap](docs/SPECIALTY_TEMPLATE_ROADMAP.md) for the
verified approach to round, oval, square, card, and nonuniform layouts.

## License

[MIT](LICENSE). Produced by Wiplash.ai.
