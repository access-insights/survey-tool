import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Role, UserProfile } from '../types';

export function AdminPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const result = await api.listUsers(token);
    setUsers(result.users);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateRole = async (userId: string, role: Role) => {
    if (!token) return;
    await api.setRole(token, userId, role);
    setStatus('Role updated');
    await load();
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Admin role management</h1>
      <p aria-live="polite">{status}</p>
      <div className="overflow-x-auto rounded border border-base-border bg-base-surface">
        <table className="min-w-full">
          <caption className="sr-only">Users and roles</caption>
          <thead>
            <tr>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-base-border">
                <td className="p-2">{user.email}</td>
                <td className="p-2">{user.fullName}</td>
                <td className="p-2">
                  <label htmlFor={`role-${user.id}`} className="sr-only">
                    Role for {user.email}
                  </label>
                  <select
                    id={`role-${user.id}`}
                    className="target-size rounded border border-base-border bg-base-bg px-2"
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value as Role)}
                  >
                    <option value="participant">Participant</option>
                    <option value="creator">Survey Author</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
