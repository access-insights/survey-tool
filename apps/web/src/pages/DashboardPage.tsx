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
  const [titleFilter, setTitleFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [lastEditedByFilter, setLastEditedByFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [status, setStatus] = useState('');

  const loadSurveys = useCallback(async () => {
    if (!token) return;
    const result = await api.listSurveys(token);
    setSurveys(result.surveys);
  }, [token]);

  useEffect(() => {
    void loadSurveys();
  }, [loadSurveys]);

  const formatSurveyStatus = (value: Survey['status']) => {
    if (value === 'draft') return 'Draft';
    if (value === 'published') return 'Published';
    if (value === 'archived') return 'Archived';
    return value;
  };

  const filtered = useMemo(() => {
    return surveys.filter((survey) => {
      const matchesTitle = titleFilter.length === 0 || survey.title.toLowerCase().includes(titleFilter.toLowerCase());
      const author = (survey.authorName ?? survey.creatorName ?? '').toLowerCase();
      const matchesAuthor = authorFilter.length === 0 || author.includes(authorFilter.toLowerCase());
      const editor = (survey.lastEditedBy ?? '').toLowerCase();
      const matchesLastEditedBy = lastEditedByFilter.length === 0 || editor.includes(lastEditedByFilter.toLowerCase());
      const formattedStatus = formatSurveyStatus(survey.status).toLowerCase();
      const matchesStatus = statusFilter.length === 0 || formattedStatus.includes(statusFilter.toLowerCase());
      const templateText = survey.isTemplate ? 'yes' : 'no';
      const matchesTemplate = templateFilter.length === 0 || templateText.includes(templateFilter.toLowerCase());

      return matchesTitle && matchesAuthor && matchesLastEditedBy && matchesStatus && matchesTemplate;
    });
  }, [authorFilter, lastEditedByFilter, statusFilter, surveys, templateFilter, titleFilter]);

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
      <div className="overflow-x-auto rounded border border-base-border bg-base-surface">
        <table className="min-w-full">
          <caption className="sr-only">Survey list</caption>
          <thead>
            <tr>
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Author</th>
              <th className="p-2 text-left">Last Edited By</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Template</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
            <tr className="border-t border-base-border">
              <th className="p-2 text-left">
                <input
                  aria-label="Filter by title"
                  className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                  value={titleFilter}
                  onChange={(e) => setTitleFilter(e.target.value)}
                />
              </th>
              <th className="p-2 text-left">
                <input
                  aria-label="Filter by author"
                  className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                />
              </th>
              <th className="p-2 text-left">
                <input
                  aria-label="Filter by last edited by"
                  className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                  value={lastEditedByFilter}
                  onChange={(e) => setLastEditedByFilter(e.target.value)}
                />
              </th>
              <th className="p-2 text-left">
                <input
                  aria-label="Filter by status"
                  className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                />
              </th>
              <th className="p-2 text-left">
                <input
                  aria-label="Filter by template"
                  className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                  value={templateFilter}
                  onChange={(e) => setTemplateFilter(e.target.value)}
                />
              </th>
              <th className="p-2 text-left" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((survey) => (
              <tr key={survey.id} className="border-t border-base-border">
                <td className="p-2">{survey.title}</td>
                <td className="p-2">{survey.authorName || survey.creatorName || 'Unknown'}</td>
                <td className="p-2">{survey.lastEditedBy || survey.authorName || survey.creatorName || 'Unknown'}</td>
                <td className="p-2">{formatSurveyStatus(survey.status)}</td>
                <td className="p-2">{survey.isTemplate ? 'Yes' : 'No'}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-2">
                    {canManageSurveys ? (
                      <>
                        <Link className="target-size rounded border border-base-border px-2 py-1" to={`/surveys/${survey.id}/view`}>
                          View
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
