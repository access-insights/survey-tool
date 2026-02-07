import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Survey } from '../types';

function roleLabel(role: string | undefined) {
  if (role === 'creator') return 'survey_author';
  return role ?? '';
}

export function DashboardPage() {
  const { token, profile } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!token) return;
    api.listSurveys(token).then((result) => setSurveys(result.surveys));
  }, [token]);

  const filtered = useMemo(() => {
    if (!query) return surveys;
    return surveys.filter((survey) => `${survey.title} ${survey.description}`.toLowerCase().includes(query.toLowerCase()));
  }, [query, surveys]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>
        Signed in as <strong>{profile?.email}</strong> ({roleLabel(profile?.role)})
      </p>
      <div className="flex flex-wrap gap-2">
        {(profile?.role === 'admin' || profile?.role === 'creator') && (
          <Link className="target-size rounded bg-base-action px-3 py-2 text-base-actionText" to="/builder">
            New survey
          </Link>
        )}
        {profile?.role === 'admin' && (
          <Link className="target-size rounded border border-base-border px-3 py-2" to="/admin">
            User roles
          </Link>
        )}
      </div>
      <label className="block max-w-sm" htmlFor="survey-search">
        <span className="mb-1 block">Search surveys and templates</span>
        <input
          id="survey-search"
          className="target-size w-full rounded border border-base-border bg-base-surface px-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="overflow-x-auto rounded border border-base-border bg-base-surface">
        <table className="min-w-full">
          <caption className="sr-only">Survey list</caption>
          <thead>
            <tr>
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Template</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((survey) => (
              <tr key={survey.id} className="border-t border-base-border">
                <td className="p-2">{survey.title}</td>
                <td className="p-2">{survey.status}</td>
                <td className="p-2">{survey.isTemplate ? 'Yes' : 'No'}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-2">
                    <Link className="target-size rounded border border-base-border px-2 py-1" to={`/builder/${survey.id}`}>
                      Edit
                    </Link>
                    <Link className="target-size rounded border border-base-border px-2 py-1" to={`/reports/${survey.id}`}>
                      Reports
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
