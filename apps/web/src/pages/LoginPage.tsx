import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const { login, profile } = useAuth();
  const isPopupWindow = typeof window !== 'undefined' && !!window.opener && window.opener !== window;

  if (profile) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isPopupWindow) {
    return (
      <section className="flex min-h-[55vh] items-center justify-center">
        <p role="status" className="rounded border border-base-border px-5 py-3">
          Sign-in is already in progress in the original window. You can close this popup.
        </p>
      </section>
    );
  }

  return (
    <section className="flex min-h-[55vh] items-center justify-center">
      <button
        className="target-size rounded border border-base-border px-5 py-3"
        onClick={() => {
          void login();
        }}
      >
        Log in to Access Insights Survey Tool
      </button>
    </section>
  );
}
