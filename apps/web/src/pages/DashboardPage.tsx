import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [status, setStatus] = useState('');

  const loadSurveys = useCallback(async () => {
    if (!token) return;
    const result = await api.listSurveys(token);
    setSurveys(result.surveys);
  }, [token]);

  useEffect(() => {
    void loadSurveys();
  }, [loadSurveys]);

  const filtered = useMemo(() => {
    if (!query) return surveys;
    return surveys.filter((survey) => `${survey.title} ${survey.description} ${survey.creatorName ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  }, [query, surveys]);

  const deleteSurvey = async (surveyId: string, surveyTitle: string) => {
    if (!token) return;
    const ok = window.confirm(`Delete survey "${surveyTitle}"? This action cannot be undone.`);
    if (!ok) return;
    await api.deleteSurvey(token, surveyId);
    setStatus('Survey deleted');
    await loadSurveys();
  };

  const archiveSurvey = async (surveyId: string, surveyTitle: string) => {
    if (!token) return;
    const ok = window.confirm(`Archive survey "${surveyTitle}"? It will no longer be active.`);
    if (!ok) return;
    await api.archiveSurvey(token, surveyId);
    setStatus('Survey archived');
    await loadSurveys();
  };

  const canManageSurveys = profile?.role === 'admin' || profile?.role === 'creator';

  return (
    <section className="space-y-4">
      <h1 className="text-2xl">Dashboard</h1>
      <p>
        Signed in as <strong>{profile?.email}</strong> ({roleLabel(profile?.role)})
      </p>
      <p aria-live="polite">{status}</p>
      <div className="flex flex-wrap gap-2">
        {(profile?.role === 'admin' || profile?.role === 'creator') && (
          <Link className="target-size rounded bg-base-action px-3 py-2 text-base-actionText" to="/builder">
            New survey
          </Link>
        )}
        <Link className="target-size rounded border border-base-border px-3 py-2" to="/reports">
          Reports
        </Link>
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
              <th className="p-2 text-left">Creator</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Template</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((survey) => (
              <tr key={survey.id} className="border-t border-base-border">
                <td className="p-2">{survey.title}</td>
                <td className="p-2">{survey.creatorName || 'Unknown'}</td>
                <td className="p-2">{survey.status}</td>
                <td className="p-2">{survey.isTemplate ? 'Yes' : 'No'}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-2">
                    {canManageSurveys ? (
                      <>
                        <Link className="target-size rounded border border-base-border px-2 py-1" to={`/reports/${survey.id}`}>
                          View survey
                        </Link>
                        <Link className="target-size rounded border border-base-border px-2 py-1" to={`/builder/${survey.id}`}>
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="target-size rounded border border-base-border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={survey.status === 'archived'}
                          onClick={() => {
                            void archiveSurvey(survey.id, survey.title);
                          }}
                        >
                          {survey.status === 'archived' ? 'Archived' : 'Archive'}
                        </button>
                        <button
                          type="button"
                          className="target-size rounded border border-base-border px-2 py-1"
                          onClick={() => {
                            void deleteSurvey(survey.id, survey.title);
                          }}
                        >
                          Delete
                        </button>
                      </>
                    ) : null}
                    {!canManageSurveys && (
                      <button
                        type="button"
                        className="target-size rounded border border-base-border px-2 py-1"
                        disabled
                      >
                        No actions
                      </button>
                    )}
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
