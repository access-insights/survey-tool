# Testing Guide

## Unit tests
- `src/tests/surveyValidation.test.ts` covers schema and conditional logic behavior.
- `src/tests/participantAutosave.test.tsx` covers participant autosave behavior and draft restoration.
- `netlify/functions/participantUtils.test.ts` covers invite expiry and response timestamp utility logic.

## Accessibility tests
- `src/tests/a11y.test.tsx` verifies key accessibility content and semantics.

## End to end tests
- `tests/e2e/a11y.spec.ts` validates keyboard tab order for skip-link and checks for zero critical axe violations.

## Run all
```bash
npm run lint
npm run test
npm run test:a11y
npm run test:e2e
```
