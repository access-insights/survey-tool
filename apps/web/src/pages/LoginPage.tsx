import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const { login, profile } = useAuth();

  if (profile) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Sign in with Microsoft 365</h1>
      <p>Use your `@accessinsights.net` work account to continue.</p>
      <button className="target-size rounded bg-base-action px-4 py-2 text-base-actionText" onClick={() => { void login(); }}>
        Open Microsoft 365 sign in
      </button>
    </section>
  );
}
