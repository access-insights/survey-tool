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
  const [filterBy, setFilterBy] = useState<'all' | 'title' | 'author' | 'lastEditedBy' | 'status' | 'template'>('all');
  const [filterValue, setFilterValue] = useState('');
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

  const filterOptions = useMemo(() => {
    const dedupe = new Set<string>();
    for (const survey of surveys) {
      if (filterBy === 'title') dedupe.add(survey.title);
      if (filterBy === 'author') dedupe.add(survey.authorName || survey.creatorName || 'Unknown');
      if (filterBy === 'lastEditedBy') dedupe.add(survey.lastEditedBy || survey.authorName || survey.creatorName || 'Unknown');
      if (filterBy === 'status') dedupe.add(formatSurveyStatus(survey.status));
      if (filterBy === 'template') dedupe.add(survey.isTemplate ? 'Yes' : 'No');
    }
    return Array.from(dedupe).sort((a, b) => a.localeCompare(b));
  }, [filterBy, surveys]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return surveys.filter((survey) => {
      const title = survey.title;
      const author = survey.authorName || survey.creatorName || 'Unknown';
      const lastEditedBy = survey.lastEditedBy || survey.authorName || survey.creatorName || 'Unknown';
      const surveyStatus = formatSurveyStatus(survey.status);
      const template = survey.isTemplate ? 'Yes' : 'No';

      const matchesQuery =
        q.length === 0 || `${title} ${author} ${lastEditedBy} ${surveyStatus} ${template}`.toLowerCase().includes(q);

      if (filterBy === 'all' || !filterValue) return matchesQuery;
      if (filterBy === 'title') return matchesQuery && title === filterValue;
      if (filterBy === 'author') return matchesQuery && author === filterValue;
      if (filterBy === 'lastEditedBy') return matchesQuery && lastEditedBy === filterValue;
      if (filterBy === 'status') return matchesQuery && surveyStatus === filterValue;
      return matchesQuery && template === filterValue;
    });
  }, [filterBy, filterValue, query, surveys]);

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
  const canDeleteSurveys = profile?.role === 'admin';

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
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[16rem] flex-1" htmlFor="survey-search">
          <span className="mb-1 block">Search surveys</span>
          <input
            id="survey-search"
            className="target-size w-full rounded border border-base-border bg-base-bg px-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="block min-w-[12rem]" htmlFor="dashboard-filter-by">
          <span className="mb-1 block">Filter by</span>
          <select
            id="dashboard-filter-by"
            className="target-size w-full rounded border border-base-border bg-base-bg px-2"
            value={filterBy}
            onChange={(e) => {
              setFilterBy(e.target.value as 'all' | 'title' | 'author' | 'lastEditedBy' | 'status' | 'template');
              setFilterValue('');
            }}
          >
            <option value="all">All columns</option>
            <option value="title">Title</option>
            <option value="author">Author</option>
            <option value="lastEditedBy">Last Edited By</option>
            <option value="status">Status</option>
            <option value="template">Template</option>
          </select>
        </label>
        {filterBy !== 'all' && (
          <label className="block min-w-[12rem]" htmlFor="dashboard-filter-value">
            <span className="mb-1 block">Filter value</span>
            <select
              id="dashboard-filter-value"
              className="target-size w-full rounded border border-base-border bg-base-bg px-2"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            >
              <option value="">All values</option>
              {filterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
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
                        {canDeleteSurveys ? (
                          <button
                            type="button"
                            className="target-size rounded border border-base-border px-2 py-1"
                            onClick={() => {
                              void deleteSurvey(survey.id, survey.title);
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
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
