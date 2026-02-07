import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { t } from '../i18n';

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout, login } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-base-text">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <header className="border-b border-base-border bg-base-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 p-4">
          <Link to="/" className="flex items-center gap-3 text-xl font-bold" aria-label={t('en', 'appName')}>
            <img src="/access-insights-logo.svg" alt="" aria-hidden="true" className="h-12 w-auto" />
            <span>{t('en', 'appName')}</span>
          </Link>
          <nav aria-label="Primary" className="flex flex-wrap items-center gap-2">
            <NavLink className="target-size rounded px-3 py-2" to="/dashboard">
              Dashboard
            </NavLink>
            <NavLink className="target-size rounded px-3 py-2" to="/accessibility">
              Accessibility
            </NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <label htmlFor="theme" className="text-sm">
              Theme
            </label>
            <select
              id="theme"
              className="target-size rounded border border-base-border bg-base-bg px-2"
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'contrast')}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="contrast">High contrast</option>
            </select>
            {!profile ? (
              <button className="target-size rounded bg-base-action px-3 text-base-actionText" onClick={() => { void login().catch(() => undefined); }}>
                Sign in with Microsoft 365
              </button>
            ) : (
              <>
                <span className="text-sm">{profile.fullName || profile.email}</span>
                <button
                  className="target-size rounded border border-base-border px-3"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl p-4">
        {children}
      </main>
    </div>
  );
}
