import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Survey } from '../types';

export function MySurveysPage() {
  const { token, profile } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [query, setQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'title' | 'status' | 'template'>('all');
  const [filterValue, setFilterValue] = useState('');
  const [status, setStatus] = useState('');

  const loadSurveys = useCallback(async () => {
    if (!token || !profile?.id) return;
    const result = await api.listSurveys(token);
    setSurveys(result.surveys.filter((survey) => survey.ownerUserId === profile.id));
  }, [token, profile?.id]);

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
      if (filterBy === 'status') dedupe.add(formatSurveyStatus(survey.status));
      if (filterBy === 'template') dedupe.add(survey.isTemplate ? 'Yes' : 'No');
    }
    return Array.from(dedupe).sort((a, b) => a.localeCompare(b));
  }, [filterBy, surveys]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return surveys.filter((survey) => {
      const title = survey.title;
      const surveyStatus = formatSurveyStatus(survey.status);
      const template = survey.isTemplate ? 'Yes' : 'No';

      const matchesQuery = q.length === 0 || `${title} ${surveyStatus} ${template}`.toLowerCase().includes(q);
      if (filterBy === 'all' || !filterValue) return matchesQuery;
      if (filterBy === 'title') return matchesQuery && title === filterValue;
      if (filterBy === 'status') return matchesQuery && surveyStatus === filterValue;
      return matchesQuery && template === filterValue;
    });
  }, [filterBy, filterValue, query, surveys]);

  const archiveSurvey = async (surveyId: string, surveyTitle: string) => {
    if (!token) return;
    const ok = window.confirm(`Archive survey "${surveyTitle}"? It will no longer be active.`);
    if (!ok) return;
    await api.archiveSurvey(token, surveyId);
    setStatus('Survey archived');
    await loadSurveys();
  };

  const deleteSurvey = async (surveyId: string, surveyTitle: string) => {
    if (!token || profile?.role !== 'admin') return;
    const ok = window.confirm(`Delete survey "${surveyTitle}"? This action cannot be undone.`);
    if (!ok) return;
    await api.deleteSurvey(token, surveyId);
    setStatus('Survey deleted');
    await loadSurveys();
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl">My Surveys</h1>
      <p aria-live="polite">{status}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[16rem] flex-1" htmlFor="my-survey-search">
          <span className="mb-1 block">Search my surveys</span>
          <input
            id="my-survey-search"
            className="target-size w-full rounded border border-base-border bg-base-bg px-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="block min-w-[12rem]" htmlFor="my-survey-filter-by">
          <span className="mb-1 block">Filter by</span>
          <select
            id="my-survey-filter-by"
            className="target-size w-full rounded border border-base-border bg-base-bg px-2"
            value={filterBy}
            onChange={(e) => {
              setFilterBy(e.target.value as 'all' | 'title' | 'status' | 'template');
              setFilterValue('');
            }}
          >
            <option value="all">All columns</option>
            <option value="title">Title</option>
            <option value="status">Status</option>
            <option value="template">Template</option>
          </select>
        </label>
        {filterBy !== 'all' && (
          <label className="block min-w-[12rem]" htmlFor="my-survey-filter-value">
            <span className="mb-1 block">Filter value</span>
            <select
              id="my-survey-filter-value"
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
          <caption className="sr-only">My survey list</caption>
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
                <td className="p-2">{formatSurveyStatus(survey.status)}</td>
                <td className="p-2">{survey.isTemplate ? 'Yes' : 'No'}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-2">
                    <Link className="target-size rounded border border-base-border px-2 py-1" to={`/surveys/${survey.id}/view`}>
                      View
                    </Link>
                    <Link className="target-size rounded border border-base-border px-2 py-1" to={`/builder/${survey.id}`}>
                      Edit
                    </Link>
                    <Link className="target-size rounded border border-base-border px-2 py-1" to={`/reports/${survey.id}`}>
                      View Report
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
                    {profile?.role === 'admin' && (
                      <button
                        type="button"
                        className="target-size rounded border border-base-border px-2 py-1"
                        onClick={() => {
                          void deleteSurvey(survey.id, survey.title);
                        }}
                      >
                        Delete
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
