# Accessibility Notes

## Scope
This MVP targets WCAG 2.2 AA for primary user journeys:
- Login
- Survey creation and publishing
- Participant completion flow
- Reporting and CSV export

## Implemented Patterns
- Skip link to main content.
- Semantic headings and landmarks.
- Keyboard navigation for all controls.
- Focus-visible styling with high contrast.
- Error summary with jump links.
- ARIA live announcements for save and submit status.
- Light, dark, and high contrast themes with persisted preference.
- Reduced motion and forced colors support.
- Minimum target size utility (`44px`).

## Testing
- Manual keyboard checks on all pages.
- Automated a11y smoke checks in Vitest.
- Playwright plus axe critical-violation gate on landing page.

## Known Gaps for Post-MVP
- Add more page-level axe coverage for authenticated routes in CI.
- Validate NVDA, VoiceOver, and JAWS interaction scripts in a test matrix.
- Add narrated announcements for randomization behavior per question.
