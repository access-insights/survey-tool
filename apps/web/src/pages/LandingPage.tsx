import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LoginPage } from './LoginPage';

export function LandingPage() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <p role="status">Loading...</p>;
  }

  if (profile) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPage />;
}
