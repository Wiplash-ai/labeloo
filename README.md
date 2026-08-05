<p align="center">
  <img src="src/assets/icons/icon128.png" alt="Labeloo name-tag icon" width="112">
</p>

# Labeloo

Labeloo is a local-first label sheet workbench and browser extension. Capture
text from a webpage or create address, name-tag, email, and custom labels, then
print them on common 30-up US Letter label stock.

## Features

- Browser context-menu capture for selected addresses.
- Quick-add extension popup with label-type selection.
- Exact 30-up sheet preview compatible with Avery 5160, 8160, and 5260.
- Multiple named sheets in one local workspace.
- Type-aware completeness checks for names, email syntax, and US address fields.
- Reuse partially consumed sheets by selecting the first available position.
- Add, edit, duplicate, reorder, search, and delete labels.
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

## License

[MIT](LICENSE). Produced by Wiplash.ai.
