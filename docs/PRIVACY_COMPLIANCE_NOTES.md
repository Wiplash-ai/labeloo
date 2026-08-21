# Labeloo privacy compliance notes

This internal checklist accompanies the public policy. It is planning material,
not legal advice.

## Quick reference

| Data path | Data | Trigger | Storage or retention |
| --- | --- | --- | --- |
| Local workspace | Names, addresses, email labels, custom text, layout settings | User edits or imports | Browser storage until user removes it |
| Wiplash SSO | Account ID, name, email, session expiry | User selects Wiplash sign-in | Essential web cookie or opaque extension session; current app session is eight hours |
| Project sync | Project and label content, settings, revision metadata | User selects Enable project sync | Account-isolated encrypted project store until deletion and backup expiry |
| Shared Google Sheet | User-supplied shared URL and workbook | User grants optional docs.google.com access | Parsed locally; not sent to Wiplash by the import itself |
| Private Google Sheet | Selected file ID and name, OAuth code/token, XLSX bytes | Signed-in user chooses one file | Token is request-scoped; workbook receipt is memory-only, one-download, and at most ten minutes |
| Commercial API | Submitted import/render data, hashed API credential, usage/security metadata | Separate API customer request | Governed by API retention and customer agreement |

Labeloo contains no analytics or advertising client. It does not request browser
history, broad page access, or blanket Google Drive read access.

## Decisions still required

- `[LEGAL REVIEW REQUIRED]` Confirm the Wiplash legal entity name, postal
  address, governing jurisdictions, and privacy-request response procedure.
- `[LEGAL REVIEW REQUIRED]` Document lawful bases and processor/controller roles
  for Wiplash identity, Google OAuth/Drive, browser stores, hosting, and backups.
- `[LEGAL REVIEW REQUIRED]` Add jurisdiction-specific access, deletion,
  correction, portability, restriction, opt-out, and appeal language once the
  initial markets are confirmed.
- Define exact production retention for account records, access/security logs,
  deleted synced projects, and encrypted backups. The public policy must be
  updated before promising those timeframes.
- Verify that support can actually locate, export, correct, and delete data by
  Wiplash account ID before publishing the rights language.
- Put data-processing agreements and Google OAuth consent-screen disclosures in
  place before enabling private Drive import in production.
- Review whether the Firefox data-collection declaration needs a content
  category for project sync and selected private workbook transit.

## Pre-publication checklist

- [ ] Attorney review completed.
- [ ] Production data map matches the deployed account BFF and reverse proxy.
- [ ] Exact browser-extension origins are allowlisted.
- [ ] Google OAuth consent screen links to the hosted policy.
- [ ] Project and account deletion procedure is tested end to end.
- [ ] Backup deletion and restoration procedures are documented.
- [ ] Browser-store privacy disclosures match the permissions and policy.
- [ ] No analytics, advertising, remote credential, or broad Drive scope was
      introduced during release packaging.
