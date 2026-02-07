import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import type { Role } from '../types';

export function ProtectedRoute({ children, allow }: { children: React.ReactNode; allow?: Role[] }) {
  const { profile, loading } = useAuth();

  if (loading) return <p>Loading account...</p>;
  if (!profile) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(profile.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
