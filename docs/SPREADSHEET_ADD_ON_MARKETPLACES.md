# Spreadsheet add-on marketplace research

Research snapshot: August 21, 2026.

Labeloo should meet people where their address data already lives. The next
distribution iteration can add thin, native spreadsheet connectors while
keeping one maintained label-mapping, editing, and printing application.

## Recommended order

| Priority | Platform | Distribution surface | Native entry point |
| ---: | --- | --- | --- |
| 1 | Google Sheets and Drive | Google Workspace Marketplace | Sheets menu/sidebar and Drive **Open with Labeloo** |
| 2 | Microsoft Excel | Microsoft Marketplace | Excel ribbon command and task pane |
| 3 | Airtable | Airtable Extensions Marketplace | Base/view/record selection extension |
| 4 | LibreOffice Calc | LibreOffice Extension Center | Calc command for selected cells or the active sheet |
| 5 | ONLYOFFICE | ONLYOFFICE Plugin Marketplace | Spreadsheet-editor plugin |
| 6 | Apache OpenOffice Calc | OpenOffice Extensions | Calc add-in or add-on |

Apple currently exposes import, export, and reusable-template workflows for
Numbers, but no comparable public Numbers add-in marketplace was identified.
Continue treating `.numbers` as a supported local import format unless Apple
introduces a first-party extension API and distribution surface.

## Platform notes

### Google Sheets and Drive

- A Sheets Editor add-on can add a Labeloo menu, dialog, and sidebar, read the
  active spreadsheet or selected range, and connect to an external service.
- Google explicitly anticipates Editor add-ons that upload spreadsheet data to
  a web service and link users to that service. External links must be correct
  and open in a new window.
- A Drive UI integration can add **Open with Labeloo** for selected Sheets and
  supported spreadsheet files. Drive passes bounded file context to a verified
  HTTPS application URL.
- The Marketplace review is separate from OAuth brand/scope verification.
- Keep `drive.file`; do not expand to blanket `drive` or `drive.readonly` access.

References:

- [Extend Google Sheets with add-ons](https://developers.google.com/workspace/add-ons/editors/sheets)
- [Configure a Drive UI integration](https://developers.google.com/workspace/drive/api/guides/enable-sdk)
- [Google Workspace Marketplace review criteria](https://developers.google.com/workspace/marketplace/about-app-review)
- [Publish to the Google Workspace Marketplace](https://developers.google.com/workspace/marketplace/how-to-publish)

### Microsoft Excel

- Build an Office.js task-pane add-in that reads the active table, used range,
  or explicit selection and previews the fields before transfer.
- Office add-ins are hosted web applications and can use Microsoft's dialog API
  for authentication and data exchange.
- Use `Office.context.ui.openBrowserWindow()` for a user-triggered handoff to
  the full Labeloo application. Do not rely on `window.open()` across Office
  webviews.
- The add-in must extend Labeloo's functionality inside Excel; it should not be
  only an advertisement or website launcher.
- Public distribution uses Microsoft Marketplace and Partner Center. The add-in
  must work across every platform and requirement set declared in its manifest.

References:

- [Publish an Office Add-in](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish-office-add-ins-to-appsource)
- [Office dialog API](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/dialog-api-in-office-add-ins)
- [Microsoft Marketplace certification policies](https://learn.microsoft.com/en-us/legal/marketplace/certification-policies)

### Airtable

- A React extension built with Airtable's Blocks SDK can convert a selected
  view or records into a Labeloo import.
- Airtable reviews third-party Marketplace extensions for security and
  functionality.
- Some enterprise administrators block extensions that send data to external
  servers. The UI must disclose the transfer and remain useful when an
  administrator denies it.
- Airtable extensions are currently a paid-plan feature, which limits reach but
  gives Labeloo a strong business-workflow audience.

References:

- [Airtable extensions overview](https://support.airtable.com/docs/airtable-extensions-overview)
- [Build Airtable custom extensions](https://www.airtable.com/guides/scale/build-airtable-custom-extensions)

### LibreOffice Calc and ODS

- ODS is the spreadsheet format; distribution is through the LibreOffice
  Extension Center.
- Package a Calc extension as an `.oxt` file using LibreOffice's UNO extension
  system. It can read the active selection, normalize values, and open the
  system browser for the Labeloo handoff.
- Preserve an offline fallback that exports the selected rows as CSV for users
  who do not want an account or network transfer.

Reference: [Publishing extensions in LibreOffice](https://wiki.documentfoundation.org/images/1/14/Publishing_extensions.pdf)

### ONLYOFFICE and Apache OpenOffice

- ONLYOFFICE plugins use HTML, CSS, and JavaScript inside its document editors,
  making UI reuse practical. Public plugins are submitted to its Plugin
  Marketplace.
- Apache OpenOffice supports UNO extensions, Calc add-ins, and add-ons through
  the OpenOffice Extensions repository. Treat it as a later compatibility
  target after LibreOffice.

References:

- [ONLYOFFICE plugin development](https://api.onlyoffice.com/docs/plugins/get-started/)
- [Apache OpenOffice extensions](https://www.openoffice.org/extensions/)

## Shared import-handoff architecture

Every connector should provide enough native functionality to be useful before
opening Labeloo:

1. Read only the range, table, view, or file the user explicitly selected.
2. Show the detected columns and row count.
3. Let the user remove columns or rows before transfer.
4. Explain that the selected values will be sent to Labeloo for mapping and
   printing.
5. Transfer the normalized workbook or row data over HTTPS only after the user
   clicks **Continue in Labeloo**.
6. Store it in an encrypted, account-scoped, short-lived import receipt.
7. Return an opaque, random, single-use handoff token.
8. Open the hosted Labeloo import route and consume the receipt once.
9. Delete the payload immediately after consumption or automatic expiry.

Do not place names, addresses, spreadsheet values, provider authorization
codes, or reusable access tokens in a URL. URLs can be retained by browser
history, analytics, reverse proxies, screenshots, and referrer headers.

The handoff token should contain no user data, expire in roughly ten minutes,
be bound to the initiating Wiplash account and connector, and reject replay.
Anonymous/local-only users should receive a CSV download or clipboard handoff
instead of silently uploading their data.

## Native connector acceptance criteria

- The connector identifies the active source and selected range clearly.
- The user can preview row count and field names before transfer.
- No background upload occurs on install, open, or selection change.
- Authentication is one-click or zero-click where the marketplace requires it.
- Sign-out and authorization revocation work.
- Loading, success, denial, expiration, and retry states have visible feedback.
- Sensitive actions cannot be triggered repeatedly while in progress.
- Privacy, support, terms, and pricing links describe the actual connector.
- Store screenshots show the real native selection and Labeloo handoff flow.
- Reviewers receive a working test account and deterministic sample sheet.
- The full mapping and print workflow remains in Labeloo rather than being
  reimplemented separately for every marketplace.

## Proposed iteration slices

1. Add a generic one-time import-receipt contract to the private account
   service and a hosted Labeloo `/import` consumer.
2. Ship a Google Sheets Editor add-on and Drive **Open with** integration using
   the existing Google OAuth project.
3. Reuse the contract for an Excel task-pane add-in.
4. Evaluate Airtable demand with a records-to-label prototype.
5. Build the LibreOffice `.oxt` connector with both secure handoff and offline
   CSV fallback.
6. Reassess ONLYOFFICE and OpenOffice after measuring installs and successful
   imports from the first four channels.

