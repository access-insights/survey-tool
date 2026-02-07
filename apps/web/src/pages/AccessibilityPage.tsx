export function AccessibilityPage() {
  return (
    <section className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Accessibility statement</h1>
      <p>
        Access Insights Survey Tool targets WCAG 2.2 AA conformance for all primary workflows. This includes keyboard-only navigation, semantic form controls, visible focus, high contrast support, reduced motion support, and screen reader compatibility.
      </p>
      <h2 className="text-xl font-semibold">Included features</h2>
      <ul className="list-disc pl-6">
        <li>Skip to content link on every page</li>
        <li>Programmatic labels for all controls</li>
        <li>Error summary with field jump links</li>
        <li>ARIA live regions for status and draft save messages</li>
        <li>Theme options: light, dark, and high contrast</li>
      </ul>
      <h2 className="text-xl font-semibold">Feedback</h2>
      <p>
        Report accessibility issues to <a href="mailto:accessibility@accessinsights.org">accessibility@accessinsights.org</a>. Include page URL, assistive tech used, and reproduction steps.
      </p>
    </section>
  );
}
