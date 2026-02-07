# Netlify Deployment

## Required environment variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AZURE_ISSUER / AZURE_JWKS_URI / AZURE_ALLOWED_AUDIENCE`
- `VITE_API_BASE` set to `/.netlify/functions`
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- `VITE_AZURE_CLIENT_ID`
- `VITE_AZURE_TENANT_ID`
- `VITE_AZURE_REDIRECT_URI`
- `VITE_AZURE_POST_LOGOUT_REDIRECT_URI`
- `AZURE_ALLOWED_AUDIENCE`
- `AZURE_ISSUER`
- `AZURE_JWKS_URI`
- `ADMIN_BOOTSTRAP_EMAILS` optional
- `DEFAULT_ORG_ID` optional
- `WEBHOOK_COMPLETION_URL` optional

## Netlify settings
- Build command: `npm run build`
- Publish directory: `apps/web/dist`
- Functions directory: `netlify/functions`

## GitHub CI
Use the workflow in `.github/workflows/ci.yml` to run lint, unit, and accessibility checks before merges.
