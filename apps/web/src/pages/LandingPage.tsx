import { Link } from 'react-router-dom';
import { t } from '../i18n';

export function LandingPage() {
  return (
    <section className="space-y-4">
      <img src="/access-insights-logo.svg" alt="Access Insights logo" className="h-24 w-auto" />
      <h1 className="text-3xl font-bold">{t('en', 'landingTitle')}</h1>
      <div className="flex flex-wrap gap-3">
        <Link className="target-size rounded bg-base-action px-4 py-2 text-base-actionText" to="/login">
          Sign in with Microsoft 365
        </Link>
        <Link className="target-size rounded border border-base-border px-4 py-2" to="/accessibility">
          Accessibility statement
        </Link>
      </div>
    </section>
  );
}
