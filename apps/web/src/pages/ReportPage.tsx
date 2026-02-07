import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export function ReportPage() {
  const { surveyId = '' } = useParams();
  const { token } = useAuth();
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!token || !surveyId) return;
    api.reportSummary(token, surveyId).then((result) => {
      setSummary(result.summary);
      setRows(result.rows);
    });
  }, [token, surveyId]);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  }, [rows, search]);

  const exportCsv = async () => {
    if (!token) return;
    const result = await api.exportCsv(token, surveyId);
    const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `survey-${surveyId}-responses.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Survey reporting</h1>
      <div className="grid gap-3 md:grid-cols-4">
        {Object.entries(summary).map(([key, value]) => (
          <div key={key} className="rounded border border-base-border bg-base-surface p-3">
            <p className="text-sm capitalize">{key.replace(/_/g, ' ')}</p>
            <p className="text-xl font-bold">{String(value)}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="target-size rounded border border-base-border px-3 py-2" onClick={exportCsv}>
          Export CSV
        </button>
        <label htmlFor="text-search" className="sr-only">
          Search free text responses
        </label>
        <input
          id="text-search"
          className="target-size rounded border border-base-border bg-base-surface px-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search text answers"
        />
      </div>
      <div className="overflow-x-auto rounded border border-base-border bg-base-surface">
        <table className="min-w-full">
          <thead>
            <tr>
              {rows[0] && Object.keys(rows[0]).map((key) => <th key={key} className="p-2 text-left">{key}</th>)}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr key={index} className="border-t border-base-border">
                {Object.entries(row).map(([key, value]) => (
                  <td key={key} className="p-2 align-top">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
