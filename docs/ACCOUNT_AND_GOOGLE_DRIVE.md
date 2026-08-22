# Labeloo accounts and Google Drive

Labeloo v0.5 uses the shared Wiplash.ai identity system. Identity, project
sync, and Google Drive access are deliberately separate decisions.

## Production authorization status

Verified August 21, 2026:

- Google Cloud project: **Labeloo Production** (`labeloo-production`). This is
  intentionally separate from the shared Wiplash SSO Google project so
  Labeloo's name, logo, callback, and Drive access cannot rebrand or broaden
  another Wiplash product.
- Audience: external and in production.
- Published branding: **Labeloo**, the Labeloo logo, the public product page,
  privacy policy, terms, support email, and the authorized `wiplash.ai` domain.
- Google reports that the branding is verified and being shown to users.
- Data access: only the non-sensitive
  `https://www.googleapis.com/auth/drive.file` scope. Google reports that
  sensitive/restricted-scope verification is not required.
- API: Google Drive API enabled. OAuth client type: confidential web
  application. Exact redirect URI:
  `https://auth.wiplash.ai/labeloo/google-drive/callback`.
- Live proof: a signed-in production user opened the verified Labeloo consent
  screen, selected the private **Fundraiser Checks - Names and Addresses -
  2026-08-20** Google Sheet through Picker, and reached Labeloo's field-mapping
  screen with 48 rows. The import was canceled before changing the user's
  current project.

The production account service exposes `googleDrive: true` from its health
endpoint. Its Google client secret remains only in the private service
environment; it is not stored in this repository or returned to a Labeloo
client.

```text
Labeloo client
  |-- Wiplash sign-in ------> auth.wiplash.ai/labeloo ---> shared Wiplash realm
  |-- enable project sync --> private Labeloo BFF --------> encrypted workspace
  `-- choose one Sheet -----> Google Picker (drive.file) -> one-time XLSX receipt
```

## User-visible rules

- Local editing, local spreadsheet uploads, shared-link Google Sheets, CSV
  export, and printing do not require an account.
- Wiplash.ai sign-in establishes the Labeloo identity. It does not upload the
  local project and it does not grant Google Drive access.
- Project content reaches Wiplash only after the user selects **Enable project
  sync**. Later local edits sync automatically until sign-out.
- **Choose from My Google Drive** is shown as an account feature. Google then
  asks the signed-in user to choose exactly one spreadsheet.
- A Google identity used to create a Wiplash account does not automatically
  authorize Google Drive. The Picker consent is always separate.

## Web and extension sessions

The hosted web app uses a signed, HttpOnly, SameSite session cookie and a CSRF
token. OIDC authorization-code and PKCE exchanges stay in the private BFF.

Extension origins cannot depend on the hosted web cookie. The extension starts
a device authorization, opens a normal Wiplash sign-in tab, displays an
eight-character confirmation code, and exchanges a one-time secret for an
opaque, server-revocable Labeloo app session. It never receives a Keycloak
token, social-provider token, or client secret.

## Google Drive boundary

The BFF uses Google's redirect-based Picker and the non-sensitive
`https://www.googleapis.com/auth/drive.file` scope. It does not request
`drive.readonly` or enumerate the user's Drive.

After the user picks one Google Sheets file, the BFF exchanges the OAuth code,
verifies the selected MIME type, exports the workbook as XLSX, and stores only
the bounded workbook bytes in a short-lived in-memory receipt. The client
downloads that receipt once. The receipt is consumed immediately, expires in
ten minutes if unused, and is not written to project storage. Google access and
refresh tokens are never returned to the client or retained for later use.

The existing public-link importer remains separate. It requests optional
`docs.google.com` host access and downloads only the shared URL supplied by the
user.

## Private service ownership

The confidential implementation lives in the private `wiplash-auth` repository
under `labeloo-account/`. It owns:

- OIDC code exchange and logout;
- web cookies, CSRF, and extension device handoff;
- encrypted, account-isolated project sync;
- Google OAuth code exchange and selected-workbook export;
- exact CORS allowlists for hosted web and released extension origins.

The public extension stores only its local workspace, sync metadata, and an
opaque Labeloo app session. Credential-shaped provider responses are rejected.

## Legacy API compatibility

Labeloo 0.4.1 and earlier use the separate password-account API at
`https://labs.wiplash.ai/labeloo/api/v1`. That contract remains available for
installed clients that have not upgraded, but new releases must not call it or
declare its host permission.

Do not redirect the legacy route to the Wiplash account BFF. The authentication
and project payloads are intentionally different, so a transparent proxy would
break older clients. Keep the legacy API and its Labs routing operational until
supported extension versions have migrated and usage has reached zero for an
agreed retirement window. The new account service remains independently owned
and routed at `https://auth.wiplash.ai/labeloo`.

## Production checklist

1. Provision the confidential `labeloo-web` client in the shared Wiplash realm
   from `wiplash-auth/config/labeloo-client.json`.
2. Deploy the isolated `labeloo-account` service and mount the dedicated nginx
   location at `https://auth.wiplash.ai/labeloo/`.
3. Set independent session and AES-256-GCM vault keys. Back up the encrypted
   project volume and document deletion/backup retention.
4. Add the exact Chrome, Edge, Opera, and Firefox extension origins to
   `LABELLOO_EXTENSION_ORIGINS`; never use a wildcard.
5. Configure a Google OAuth web client with the exact callback
   `https://auth.wiplash.ai/labeloo/google-drive/callback`, the `drive.file`
   scope, and the required consent-screen disclosures.
6. Run the BFF contract suite and all four packaged extension builds before
   enabling the `googleDrive` capability in production.
7. Build an explicit legacy-account migration or support procedure before
   retiring the old Labeloo password-account data.

Official Google references:

- [Choose Google Drive API scopes](https://developers.google.com/drive/api/guides/api-specific-auth)
- [Redirect-based Google Picker](https://developers.google.com/workspace/drive/picker/guides/desktop-mobile-picker)
