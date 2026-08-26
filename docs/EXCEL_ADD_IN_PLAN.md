# Labeloo for Microsoft Excel

Implementation plan: August 26, 2026.

## Product outcome

Build a public Excel Office Add-in that turns the range a user is already
working with into mapped, editable, print-ready Labeloo labels. The add-in
should feel like the Google Sheets connector, use the same secure handoff, and
avoid Microsoft Graph or OneDrive access in version 1.

The primary flow is:

1. Select cells in Excel.
2. Choose **Create labels** from the Labeloo ribbon group.
3. Confirm the source, map fields, and preview labels in a task pane.
4. Continue to Labeloo as a new label sheet or fill blank positions in the
   active Labeloo sheet.
5. Edit, reuse partial stock, print, or save a PDF in the full Labeloo editor.

## Version 1 decisions

| Decision | Choice |
| --- | --- |
| Product name | **Labeloo for Excel** |
| Host | Excel on the web, Windows, and macOS |
| Distribution | Microsoft Marketplace through Partner Center |
| Primary entry point | **Create labels** button in a Labeloo group on the Home ribbon |
| Secondary entry point | **Create labels from selection** context-menu command where supported |
| Workflow UI | Right-side task pane with Select, Map, Preview, and Continue steps |
| Workbook permission | Read the current workbook only; never write cells |
| Microsoft Graph | Not requested in version 1 |
| File browsing | Not included; the user works from the workbook already open |
| Authentication | Microsoft nested app authentication with a one-time Wiplash account-link fallback |
| Labeloo handoff | Existing account-bound, single-use connector and receipt contract |
| Manifest | Add-in-only XML manifest for the widest stable Excel compatibility |
| Custom functions | Not included |

The ribbon command is the dependable discovery surface. Microsoft supports
Office add-in commands on the web, Windows, and Mac. The context-menu command
is a useful shortcut, but it must remain an enhancement rather than the only
way to launch the workflow.

## User experience

### Ribbon

Add a **Labeloo** group to Excel's Home tab with:

- **Create labels** — opens the task pane and reads the current selection.
- **Open Labeloo** — opens the full label editor without importing cells.
- **Help** — opens the public Labeloo support page.

Keep the primary command visible and avoid a custom ribbon tab for only three
actions.

### Context menu

Add **Create labels in Labeloo** to the cell-selection context menu where the
declared manifest and host support it. Opening the task pane must preserve the
selection that existed when the command was invoked. Certification QA must
verify this on Excel web, Windows, and Mac; the ribbon remains the fallback.

### Task pane

Reuse the Google Sheets connector's visual system and four focused stages:

1. **Select**
   - Selected cells.
   - Surrounding region.
   - Active table when the selection is inside an Excel table.
   - Used range.
   - Custom A1 range.
   - Rows or columns as records.
   - Header and first/last record controls.
2. **Map**
   - Reuse the same field inference, destination types, duplicate-destination
     prevention, and multiline address mapping as the Sheets add-on.
3. **Preview**
   - Show skipped blank records and the exact strings that will be transferred.
4. **Continue**
   - Connect or silently restore the user's account.
   - Default to **Add as a new sheet**.
   - Offer **Fill current Labeloo sheet** in the Continue caret menu.
   - Explain that Excel is unchanged and only mapped values are handed off.

Use the stable bottom action dock from the Sheets add-on so the buttons do not
jump between steps.

## Technical architecture

```text
Excel workbook
  -> Office.js host adapter reads explicit range.text values
  -> shared Labeloo import core normalizes and maps records
  -> task pane previews the payload locally
  -> user clicks Continue in Labeloo
  -> Labeloo account service issues a short-lived connector handoff
  -> Labeloo API stores an encrypted, account-bound, single-use receipt
  -> system browser opens the hosted Labeloo editor
  -> editor consumes the receipt once and applies the chosen destination
```

### Public repository boundary

Create a new public sibling repository named `labeloo-excel` containing:

- Office add-in manifest and command assets.
- TypeScript task-pane application.
- Excel host adapter.
- Mapping and preview UI.
- Tests, store copy, release assets, and reviewer guide.

Keep account linking, connector credentials, receipt encryption, rate limits,
and operational configuration in the private Labeloo API repository.

### Shared connector core

Before copying the Sheets implementation, extract the host-independent pieces
into a small public package or workspace module:

- Header detection.
- Row/column orientation.
- Record bounds.
- Field inference and mapping validation.
- Blank-record filtering.
- Label preview normalization.
- Connector payload schema and destination intent.

Host adapters should only supply workbook metadata and a rectangular matrix of
displayed strings. Keep Apps Script and Office.js calls outside the shared core.
Run the same fixture suite against both connectors to prevent behavior drift.

### Excel data adapter

Use `Excel.run` and load only the values needed for the active choice:

- `context.workbook.getSelectedRange()` for the explicit selection.
- The active worksheet's used range for **Used range**.
- The containing table or surrounding region when available.
- `worksheet.getRange(a1Address)` for custom A1 input.
- `Range.text`, `address`, `rowCount`, and `columnCount` for displayed strings
  and source metadata.

Do not load formulas, comments, workbook history, other files, or OneDrive.
Apply the same 2,001-row, 100-column, and 200,000-cell limits as the Sheets
connector unless Excel profiling supports a lower safe cap.

### Manifest and permissions

Start with the latest released add-in-only XML schema and declare Excel as the
only host. Request `ReadDocument`, use Microsoft's hosted production
`Office.js`, serve every page and icon over HTTPS, and include a support URL.

Use manifest `ShowTaskpane` actions for Marketplace ribbon/context commands.
Do not depend on `Office.addin.showAsTaskpane()`; Microsoft no longer honors
that method for Marketplace-published add-ins. A shared runtime is optional for
version 1 and should be added only if cross-command state proves necessary.

### Authentication

Use MSAL.js nested app authentication (NAA), which supports Excel add-ins and
both Microsoft personal accounts and Microsoft Entra work/school accounts.

Create a multitenant Entra app registration with:

- `brk-multihub://<production-add-in-origin>` as the trusted broker redirect.
- A production task-pane SPA redirect for Excel on the web.
- A dialog fallback redirect.
- A delegated scope for the Labeloo connector API rather than Microsoft Graph.

Call `acquireTokenSilent` first. Send only an access token issued for the
Labeloo connector API to the private service; never send an ID token to the
backend. Bind Microsoft's tenant and object identifiers to a Wiplash account.

For a new Microsoft identity, create the Wiplash account only after explicit
consent. For an existing Wiplash user whose Microsoft identity is not linked,
show a one-time account-link dialog. Never link accounts by matching email
alone. Subsequent imports should be silent until the grant expires or the user
disconnects.

### Browser handoff

Reuse the current connector contract:

- Two-minute opaque handoff token, bound to the user, connector, and browser.
- Ten-minute encrypted data receipt, consumed once.
- No workbook values, names, addresses, authorization codes, or reusable tokens
  in URLs.
- `Office.context.ui.openBrowserWindow()` for the user-triggered full-editor
  handoff, with the Office dialog API as the documented fallback.
- Visible blocked-popup and expired-session recovery links.

## Implementation sequence

### Milestone 0 — shared contract (1 day)

- Extract the pure mapping core and fixtures.
- Define `excel` as a connector type in the private API.
- Add destination-intent and receipt contract tests shared with Google Sheets.
- Confirm no regression in the existing Sheets add-on.

### Milestone 1 — Excel shell (1 day)

- Create `labeloo-excel`.
- Scaffold TypeScript, Vite, Office.js, tests, and the add-in-only manifest.
- Add the Home-ribbon task-pane command and Labeloo icons.
- Sideload in Excel on the web against a sanitized workbook.

### Milestone 2 — import workflow (2 days)

- Implement selection, table/region, used range, and custom A1 adapters.
- Port the four-step task-pane UI.
- Connect the shared mapping core and local preview.
- Add loading, retry, bounds, accessibility, and popup-blocked states.

### Milestone 3 — identity and handoff (2 days)

- Create the Entra app registration and NAA configuration.
- Add private Microsoft connector endpoints and account linking.
- Reuse single-use receipts and both destination modes.
- Verify silent reconnect, disconnect, expiration, and replay rejection.

### Milestone 4 — cross-platform QA and Marketplace package (2-4 days)

- Test Excel web, current Microsoft 365 Excel on Windows, and current Excel on
  macOS at normal and enlarged zoom.
- Validate ribbon and context-menu behavior on every declared host.
- Run manifest validation and Partner Center automated checks.
- Prepare listing copy, privacy disclosures, reviewer instructions, icons, and
  four real screenshots.
- Submit through Partner Center and respond to certification findings.

Expected implementation time: roughly 8-10 working days, assuming the Partner
Center publisher account and Windows/macOS Excel test environments are ready.
Microsoft states that human certification commonly takes another 3-5 working
days after automated checks.

## Acceptance criteria

- Ribbon launch reads the exact selected range without modifying the workbook.
- Context-menu launch uses the current selection where supported.
- Source, orientation, header, bounds, mapping, and preview match Google Sheets.
- No workbook values leave Excel until the user clicks Continue.
- No Microsoft Graph or OneDrive permission is requested.
- A returning user normally imports without another login prompt.
- Existing Wiplash users can link once without email-based auto-linking.
- New and fill-current Labeloo destinations both work and are visibly distinct.
- Receipt URLs contain no spreadsheet data or reusable credentials.
- Replay, expiration, disconnect, and popup-blocking paths are tested.
- The add-in works in Excel web, Windows, and Mac for every declared feature.
- Store screenshots show the real task pane inside Excel with sanitized data.

## Release risks to resolve early

- Confirm Partner Center publisher and trader verification before the listing
  work begins.
- Test NAA availability and fallback behavior on the oldest Office version we
  intend to declare.
- Validate that the Excel cell context-menu command is certifiable on every
  targeted host; remove it from the manifest if it creates a compatibility gap.
- Keep the manifest version incremented for every Marketplace package update.
- Ensure production icon endpoints are cacheable and do not send `no-cache` or
  `no-store` headers.

## Primary references

- [Build Excel add-ins with Office Add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/excel/excel-add-ins-overview)
- [Select or get the current Excel range](https://learn.microsoft.com/en-us/office/dev/add-ins/excel/excel-add-ins-ranges-set-get)
- [Office Add-ins manifests](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/add-in-manifests)
- [Add-in commands](https://learn.microsoft.com/en-us/office/dev/add-ins/design/add-in-commands)
- [Nested app authentication](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/enable-nested-app-authentication-in-your-add-in)
- [Microsoft Marketplace certification policies](https://learn.microsoft.com/en-us/legal/marketplace/certification-policies)
- [Submit an Office add-in through Partner Center](https://learn.microsoft.com/en-us/partner-center/marketplace-offers/submit-to-appsource-via-partner-center)
