import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { AuditEntry, Role, UserProfile } from '../types';

export function AdminPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const [usersResult, logsResult] = await Promise.all([api.listUsers(token), api.listAudit(token)]);
    setUsers(usersResult.users);
    setLogs(logsResult.logs);
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
    <section className="space-y-6">
      <section className="space-y-4">
        <h1 className="text-2xl">Admin role management</h1>
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

      <section className="space-y-4">
        <h2 className="text-xl">Activity log</h2>
        <div className="overflow-x-auto rounded border border-base-border bg-base-surface">
          <table className="min-w-full">
            <caption className="sr-only">Admin and creator activity log</caption>
            <thead>
              <tr>
                <th className="p-2 text-left">Date and time</th>
                <th className="p-2 text-left">User</th>
                <th className="p-2 text-left">Action</th>
                <th className="p-2 text-left">Resource</th>
                <th className="p-2 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-base-border">
                  <td className="p-2">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="p-2">{log.actorName}</td>
                  <td className="p-2">{log.action}</td>
                  <td className="p-2">{`${log.resourceType}:${log.resourceId}`}</td>
                  <td className="p-2">{JSON.stringify(log.details)}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td className="p-3" colSpan={5}>
                    No activity logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
