<p align="center">
  <img src="src/assets/labeloo-mark.svg" alt="Labeloo logo" width="112">
</p>

# Labeloo

Labeloo is a local-first address label workbench and browser extension. Select
an address on a webpage, send it to Labeloo, edit the sheet, and print on common
30-up US Letter address-label stock.

## V1 features

- Browser context-menu capture for selected addresses.
- Quick-add extension popup.
- Exact 30-up sheet preview compatible with Avery 5160, 8160, and 5260.
- Reuse partially consumed sheets by selecting the first available position.
- Add, edit, duplicate, reorder, search, and delete labels.
- Paste address blocks or import CSV files with flexible column names.
- Browser-local auto-save and CSV export.
- Print at 100% scale or use the browser's Save as PDF command.
- Chrome, Edge, Opera, Firefox, and standalone web builds.

Labeloo does not send addresses or browsing data to Wiplash or another service.
It has no account, analytics, advertising, backend, or remote API.

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
- `contextMenus` adds “Add address to Labeloo” when text is selected.
- No host permissions are requested.

Address labels manufactured by Avery are referenced solely for compatibility.
Labeloo is not affiliated with or endorsed by Avery Products Corporation.

## License

[MIT](LICENSE). Produced by Wiplash.ai.
