import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Survey } from '../types';

export function ReportsPage() {
  const { token } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!token) return;
    api.listSurveys(token).then((result) => setSurveys(result.surveys));
  }, [token]);

  const published = useMemo(
    () => surveys.filter((survey) => survey.status === 'published' && survey.title.toLowerCase().includes(query.toLowerCase())),
    [surveys, query]
  );

  return (
    <section className="space-y-4">
      <h1 className="text-2xl">Reports</h1>
      <p>Choose a published survey to open response reporting.</p>
      <label className="block max-w-sm" htmlFor="report-search">
        <span className="mb-1 block">Search published surveys</span>
        <input
          id="report-search"
          className="target-size w-full rounded border border-base-border bg-base-surface px-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="overflow-x-auto rounded border border-base-border bg-base-surface">
        <table className="min-w-full">
          <caption className="sr-only">Published surveys for reporting</caption>
          <thead>
            <tr>
              <th className="p-2 text-left">Survey</th>
              <th className="p-2 text-left">Creator</th>
              <th className="p-2 text-left">Updated</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {published.map((survey) => (
              <tr key={survey.id} className="border-t border-base-border">
                <td className="p-2">{survey.title}</td>
                <td className="p-2">{survey.creatorName || 'Unknown'}</td>
                <td className="p-2">{new Date(survey.updatedAt).toLocaleString()}</td>
                <td className="p-2">
                  <Link className="target-size rounded border border-base-border px-3 py-1" to={`/reports/${survey.id}`}>
                    Open report
                  </Link>
                </td>
              </tr>
            ))}
            {published.length === 0 && (
              <tr>
                <td className="p-3" colSpan={4}>
                  No published surveys found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Link className="target-size inline-flex rounded border border-base-border px-3 py-2" to="/dashboard">
        Back to dashboard
      </Link>
    </section>
  );
}
