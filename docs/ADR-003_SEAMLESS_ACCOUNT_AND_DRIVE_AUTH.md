# ADR-003: Seamless account and Drive authorization

- **Status:** Accepted
- **Context:** Labeloo's original extension handoff opened a full tab, displayed
  a confirmation code, and produced an eight-hour in-memory session. Google
  Drive import also forced the consent screen on every selection and left a
  full tab open. Both flows interrupted spreadsheet import.
- **Decision:** New extension builds use the browser-owned
  `identity.launchWebAuthFlow` window, state, and S256 PKCE to exchange a
  one-time authorization code for a revocable 30-day Labeloo session. The
  private account service persists only encrypted identity claims and a hash of
  the opaque token. Existing device endpoints remain for installed versions and
  capability fallback. Google authorization omits `prompt` by default, uses
  `select_account` only on an explicit account switch, and opens in a compact
  chooser window that Labeloo closes after the one-time workbook download.
- **Consequences:** The extension adds the warning-free `identity` permission
  but not `identity.email`. Released browser callback URLs must be configured
  exactly. Firefox's callback URL is the trust anchor because its runtime origin
  varies by installation. Users normally sign in once per 30 days and approve
  Google only when Google determines authorization is required.
- **Alternatives considered:** Keeping the device-code flow was compatible but
  retained avoidable tabs and manual confirmation. Embedding login in an iframe
  would weaken provider compatibility and violate browser/provider guidance.
  Retaining Google refresh tokens would reduce OAuth redirects but would add
  durable provider credentials and broader revocation responsibilities.
