# Access Insights Survey Tool Architecture

## Goals
- Accessible survey and screener MVP with WCAG 2.2 AA patterns by default.
- Netlify-native deployment using static frontend plus Netlify Functions.
- Server-side RBAC and ownership checks for all sensitive operations.
- Multi-tenant-ready data model with an initial single-org seed.

## Stack
- Frontend: React, TypeScript, Vite, React Router, Tailwind CSS.
- Forms and validation: react-hook-form + zod.
- Backend: Netlify Functions (TypeScript) with shared zod validation.
- Auth: In-app Microsoft 365 auth (Azure AD) with role mapping in database.
- Database: Supabase Postgres with Row Level Security.
- Tests: Vitest, Testing Library, Playwright, axe-core.

## High-Level Components
- `apps/web`: SPA for Admin, Creator, Participant, and public pages.
- `netlify/functions`: API endpoints for auth-aware CRUD and reporting.
- `db`: SQL schema, RLS policies, and seed migration.
- `docs`: setup, deployment, accessibility, threat model, and test notes.

## Access Model
- Identity is issued by Azure AD in-app authentication.
- Function layer verifies JWT and maps `sub` to `users.id`.
- Roles: `admin`, `creator` (displayed as survey author), `participant`.
- Authorization is enforced in functions and again in Supabase RLS.

## Core Domain Model
- Surveys use immutable published versions:
  - `surveys` stores metadata and lifecycle state.
  - `survey_versions` stores draft and published version payload.
  - `questions` and `question_options` are version-bound.
- `invites` hold participant tokens and expiration.
- `responses` and `response_answers` store submissions.
- `audit_log` captures high-value events.

## API Design
- Netlify Functions under `/api/*` with JSON responses.
- Functions perform:
  - JWT verification.
  - Zod input validation.
  - Role and ownership checks.
  - Database calls via Supabase service role key.
- Rate limit for participant submission endpoints using token and IP buckets.

## Accessibility Strategy
- Semantic HTML with explicit labels and grouped controls.
- Error summary component with focus management and jump links.
- Keyboard-first interactions for all controls including reordering.
- Themes: light, dark, high-contrast with persisted preference.
- Forced-colors and reduced-motion media query handling.
- Tables-first reporting, with optional charts only when text equivalents exist.

## Deployment
- Netlify builds frontend from `apps/web/dist`.
- Netlify Functions deployed from `netlify/functions`.
- Environment variables store Supabase and Identity secrets.
- GitHub Actions run lint, unit, a11y, and Playwright checks.
