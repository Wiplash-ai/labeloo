# Labeloo Privacy Notice

Last updated: August 21, 2026

Labeloo is local-first. Editing, validating, importing files, exporting, and
printing label projects use browser storage and do not require an account or
upload a project to Wiplash. Local validation checks syntax and completeness;
it does not confirm postal deliverability. Printing happens in the current
browser document.

## Wiplash.ai account

Labeloo uses Wiplash.ai single sign-on. When a user signs in, Labeloo receives
an opaque account identifier, name, email address, and session expiration from
the shared Wiplash identity service. Labeloo does not receive or store the
user's Wiplash password or an upstream Google, GitHub, or other identity-
provider token. The hosted app uses an essential HttpOnly session cookie. The
extension stores an opaque, expiring Labeloo app session in extension storage.

Signing in does not upload the current label project. If the user separately
enables project sync, Labeloo sends the project name, label and address content,
sheet settings, and revision metadata to the first-party Labeloo account
service. Synced projects are isolated by Wiplash account and encrypted at rest.
Signing out keeps the local copy and disables automatic sync on that browser.

## Spreadsheet imports

Spreadsheet files selected from the user's device are parsed locally. A public
or anyone-with-link Google Sheet is downloaded directly from the shared URL
after the user grants optional `docs.google.com` host access; it does not use
Google OAuth.

Private Google Drive import is available only to a signed-in Wiplash.ai user.
Google separately asks the user to choose one Google Sheets file using the
narrow `drive.file` permission. The first-party Labeloo account service
temporarily processes the selected file ID, file name, Google authorization
code and access token, and exported workbook bytes to deliver that spreadsheet
to Labeloo. It does not request blanket Drive access. Google tokens are not
returned to the Labeloo client or retained for later use. Workbook bytes are
limited to 25 MB, kept in memory for no more than ten minutes, consumed on the
first download, and not saved as a cloud project unless the user later enables
project sync.

## Extension permissions

- `storage` keeps the local project, optional opaque account session, sync
  metadata, and pending context-menu selection.
- `contextMenus` offers “Add selection to Labeloo” for text selected by the
  user.
- Optional `https://auth.wiplash.ai/*` access is requested when the user starts
  Wiplash sign-in, private Drive selection, or project sync.
- Optional `https://docs.google.com/*` access is requested only for a shared-
  link Google Sheet import.

Labeloo does not collect browsing history, run advertising or analytics, or use
project content for behavioral advertising. Wiplash does not sell address lists
or synced project content.

Users can work entirely locally, sign out while retaining the local copy, and
request access, correction, export, or deletion of account data by contacting
support@wiplash.ai. Local data can be removed through browser storage controls
or by uninstalling the extension. Security and operational backups may persist
for a limited period according to Wiplash retention procedures.

The complete hosted policy is available at
<https://labs.wiplash.ai/labeloo/privacy/>.
