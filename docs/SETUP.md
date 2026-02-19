# Setup Guide

## Prerequisites
- Windows 11 with WSL2 enabled.
- Node.js 20 LTS in WSL2.
- npm 10+.
- Docker Desktop optional for local Postgres tooling.
- Supabase project (cloud) and Netlify site.

## Clone and Install
```bash
git clone git@github.com:Access-Insights/survey-tool.git
cd survey-tool
npm install
npm run install:all
```

## Environment Variables
Create `.env` in repo root:
```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AZURE_ISSUER / AZURE_JWKS_URI / AZURE_ALLOWED_AUDIENCE=
ALLOWED_EMAIL_DOMAIN=accessinsights.net
WEBHOOK_COMPLETION_URL=
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_REPLY_TO=
PARTICIPANT_PORTAL_BASE_URL=
VITE_API_BASE=/.netlify/functions
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Create `apps/web/.env.local` for frontend local values:
```bash
VITE_API_BASE=/.netlify/functions
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Microsoft 365 Sign In via Azure AD
1. In Azure portal, open App registrations and create an app for this project.
2. Platform type: Single-page application.
3. Add redirect URIs for local and Netlify domains.
   - Include popup callback URIs, for example:
     - `http://localhost:8888/auth/popup-callback.html`
     - `https://<your-netlify-site>.netlify.app/auth/popup-callback.html`
4. Use scopes: openid profile email.
5. Set tenant restriction to your organization.
6. Set environment values for issuer, audience, and JWKS URI.

The backend enforces domain restriction through `ALLOWED_EMAIL_DOMAIN`.
The backend can bootstrap initial admins through `ADMIN_BOOTSTRAP_EMAILS`.

## Database Setup
1. Open Supabase SQL editor.
2. Run `db/001_schema.sql`.
3. Run `db/002_rls.sql`.
4. Run `db/003_seed.sql`.
5. Run `db/004_question_bank.sql`.
6. Run `db/005_question_bank_archive.sql`.
7. Run `db/006_question_bank_randomize_options.sql`.
8. Run `db/007_security_hardening.sql`.

## Run Locally
Use Netlify CLI so functions and SPA run together:
```bash
npm run dev
```

Web app:
- `http://localhost:8888`

## Test Commands
```bash
npm run lint
npm run test
npm run test:a11y
npm run test:e2e
```

## Windows 11 + WSL2 Notes
- Run all Node commands inside WSL2 filesystem, not mounted Windows paths, for faster file watchers.
- If Playwright browsers are missing:
```bash
cd apps/web
npx playwright install
```
- If Linux browser deps are missing:
```bash
cd apps/web
sudo npx playwright install-deps chromium
```
- If port conflicts occur, set `NETLIFY_DEV_PORT` before `npm run dev`.

## Netlify Deployment
1. Push repo to GitHub.
2. In Netlify, create site from GitHub repo.
3. Build command: `npm run build`.
4. Publish directory: `apps/web/dist`.
5. Functions directory: `netlify/functions`.
6. Add required environment variables in Netlify UI.
7. Add Azure and Supabase environment variables in Netlify and deploy.

## Roles Bootstrap
- First user should be promoted to `admin` in `users.role` table.
- Admin panel can then assign roles to other users.
