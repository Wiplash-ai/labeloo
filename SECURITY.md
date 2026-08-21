# Security Policy

Report a Labeloo security concern privately to `security@wiplash.ai`. Do not
include real addresses, credentials, or other sensitive personal data in the
initial report.

Labeloo has no analytics client or required host permissions. Its optional
account client reaches only `auth.wiplash.ai` after a user starts Wiplash.ai
sign-in, private Drive selection, or project sync. The browser client never
receives Keycloak, Google access, or Google refresh tokens. Web mutations use
CSRF protection; extensions use an opaque app session delivered through a
one-time device handoff. Project sync is account-isolated, revision-safe, and
encrypted at rest.

Private Drive import uses Google's narrow `drive.file` scope and one selected
Google Sheet. The private service exports a bounded XLSX workbook into a
short-lived, in-memory, one-download receipt. Shared-link Google Sheet import
separately requests access only to `docs.google.com` and does not use OAuth.
Uploaded workbook bytes are parsed locally, and spreadsheet formulas or macros
are never executed. Selected webpage text is accepted only through the
browser's context-menu event and stored locally until the editor consumes it.
