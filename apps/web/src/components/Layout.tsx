import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { t } from '../i18n';

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, profile]);

  return (
    <div className="min-h-screen text-base-text">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <header className="border-b border-base-border bg-base-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 p-3">
          <Link to="/" className="flex items-center gap-2 text-lg" aria-label={t('en', 'appName')}>
            <picture>
              <source srcSet="/access_insights_logo_inverse.png" media="(prefers-color-scheme: dark), (forced-colors: active)" />
              <img src="/access_insights_logo.png" alt="" aria-hidden="true" className="h-16 w-auto" />
            </picture>
            <span>{t('en', 'appName')}</span>
          </Link>

          {profile ? (
            <>
              <button
                type="button"
                className="target-size rounded border border-base-border px-3 py-2 md:hidden"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-controls="primary-nav-mobile"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((current) => !current)}
              >
                Menu
              </button>

              <nav aria-label="Primary" className="hidden flex-nowrap items-center gap-1 md:flex">
                <NavLink className="target-size rounded px-3 py-2" to="/dashboard">
                  Dashboard
                </NavLink>
                {(profile.role === 'admin' || profile.role === 'creator') && (
                  <NavLink className="target-size rounded px-3 py-2" to="/my-surveys">
                    My Surveys
                  </NavLink>
                )}
                <NavLink className="target-size rounded px-3 py-2" to="/reports">
                  Reports
                </NavLink>
                {(profile.role === 'admin' || profile.role === 'creator') && (
                  <NavLink className="target-size rounded px-3 py-2" to="/question-bank">
                    Question Bank
                  </NavLink>
                )}
                <NavLink className="target-size rounded px-3 py-2" to="/guide">
                  Guide
                </NavLink>
                {profile.role === 'admin' && (
                  <NavLink className="target-size rounded px-3 py-2" to="/admin">
                    Admin
                  </NavLink>
                )}
              </nav>
            </>
          ) : null}

          <div className="ml-auto hidden items-center gap-2 md:flex">
            {profile ? (
              <>
                <span className="text-sm">{profile.fullName || profile.email}</span>
                <button
                  className="target-size rounded border border-base-border px-3 py-2"
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
        {profile && mobileMenuOpen ? (
          <div id="primary-nav-mobile" className="border-t border-base-border p-3 md:hidden">
            <nav aria-label="Primary" className="flex flex-col gap-2">
              <NavLink className="target-size rounded px-3 py-2" to="/dashboard">
                Dashboard
              </NavLink>
              {(profile.role === 'admin' || profile.role === 'creator') && (
                <NavLink className="target-size rounded px-3 py-2" to="/my-surveys">
                  My Surveys
                </NavLink>
              )}
              <NavLink className="target-size rounded px-3 py-2" to="/reports">
                Reports
              </NavLink>
              {(profile.role === 'admin' || profile.role === 'creator') && (
                <NavLink className="target-size rounded px-3 py-2" to="/question-bank">
                  Question Bank
                </NavLink>
              )}
              <NavLink className="target-size rounded px-3 py-2" to="/guide">
                Guide
              </NavLink>
              {profile.role === 'admin' && (
                <NavLink className="target-size rounded px-3 py-2" to="/admin">
                  Admin
                </NavLink>
              )}
              <p className="px-3 py-1 text-sm">{profile.fullName || profile.email}</p>
              <button
                className="target-size rounded border border-base-border px-3 py-2 text-left"
                onClick={() => {
                  void logout();
                  navigate('/');
                }}
              >
                Log out
              </button>
            </nav>
          </div>
        ) : null}
      </header>
      <main id="main" className="mx-auto max-w-6xl p-4">
        {children}
      </main>
    </div>
  );
}
