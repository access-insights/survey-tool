# Threat Model

## Assets
- Survey definitions and unpublished drafts.
- Invite tokens and response payloads.
- PII fields in response answers.
- Role assignments and audit records.

## Trust Boundaries
- Browser to Netlify Functions.
- Netlify Functions to Supabase.
- Azure AD token issuance and verification.

## Primary Risks
- Broken access control.
- Token replay on participant invite links.
- Input abuse and large payload denial.
- Sensitive data leakage via exports.
- Stored XSS in response rendering.

## Controls in MVP
- Server-side role and ownership checks in all privileged actions.
- JWT verification in functions (`AZURE_ISSUER / AZURE_JWKS_URI / AZURE_ALLOWED_AUDIENCE`).
- Zod validation on function inputs.
- Basic endpoint rate limiting for participant paths.
- Invite expiration support and completion lock to prevent double submit.
- CSV export restricted to admin and survey author ownership scope.
- Audit events for create, publish, role update, and export.

## Additional Controls Recommended
- Managed rate limiting store (Redis or Deno KV) for distributed environments.
- PII column encryption or field-level tokenization.
- Signed webhook requests for completion webhooks.
- CSP and strict response headers via Netlify headers config.
