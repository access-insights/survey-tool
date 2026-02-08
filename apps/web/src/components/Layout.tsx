import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { t } from '../i18n';

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-base-text">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <header className="border-b border-base-border bg-base-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 p-4">
          <Link to="/" className="flex items-center gap-3 text-xl" aria-label={t('en', 'appName')}>
            <picture>
              <source srcSet="/access_insights_logo_inverse.png" media="(prefers-color-scheme: dark), (forced-colors: active)" />
              <img src="/access_insights_logo.png" alt="" aria-hidden="true" className="h-24 w-auto" />
            </picture>
            <span>{t('en', 'appName')}</span>
          </Link>

          <nav aria-label="Primary" className="flex flex-wrap items-center gap-2">
            {profile && (
              <NavLink className="target-size rounded px-3 py-2" to="/dashboard">
                Dashboard
              </NavLink>
            )}
            <NavLink className="target-size rounded px-3 py-2" to="/guide">
              User guide
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            {profile ? (
              <>
                <span className="text-sm">{profile.fullName || profile.email}</span>
                <button
                  className="target-size rounded border border-base-border px-3"
                  onClick={() => {
                    void logout();
                    navigate('/');
                  }}
                >
                  Log out
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl p-4">
        {children}
      </main>
    </div>
  );
}
