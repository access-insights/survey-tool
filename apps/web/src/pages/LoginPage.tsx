import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const { login, profile } = useAuth();

  if (profile) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="flex min-h-[55vh] items-center justify-center">
      <button className="target-size rounded border border-base-border px-5 py-3" onClick={() => { void login(); }}>
        Log in to Access Insights Survey Tool
      </button>
    </section>
  );
}
