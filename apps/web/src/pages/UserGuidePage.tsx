import { useMemo, useState } from 'react';

interface GuideSection {
  id: string;
  title: string;
  content: string[];
}

const sections: GuideSection[] = [
  {
    id: 'roles',
    title: 'Roles and capabilities',
    content: [
      'Admin: manage roles, view all surveys, view activity logs, publish and delete across the organization.',
      'Survey author: create and edit own surveys, preview, publish, generate links, and review reports for owned surveys.',
      'Participant: access only invite-linked surveys and submit responses.'
    ]
  },
  {
    id: 'auth',
    title: 'Authentication methods',
    content: [
      'Internal users authenticate with Microsoft 365 and must use an accessinsights.net account.',
      'Internal role assignment happens in the application database and is enforced server-side.',
      'External participants use invite links and do not need Microsoft login.'
    ]
  },
  {
    id: 'builder',
    title: 'Survey builder workflow',
    content: [
      'Create a survey from Dashboard and enter title, description, intro, consent text, thank-you message, and tags.',
      'Add questions and configure type, required status, help text, min/max, regex, max characters, PII flag, option randomization, and conditional logic.',
      'Use Save draft, Save and add new question, and Preview draft survey as the primary authoring flow.',
      'Question types include single choice, multiple choice, short and long text, number, email, phone, date, dropdown, yes/no, Likert, and consent checkbox.'
    ]
  },
  {
    id: 'publish',
    title: 'Publishing and link generation',
    content: [
      'Publish is available after draft setup and records the publish event in audit logs.',
      'Create survey link generates an invite token URL for participant access.',
      'Use the Copy button next to generated links for quick sharing.'
    ]
  },
  {
    id: 'reporting',
    title: 'Reporting and audit trails',
    content: [
      'Reports page lists published surveys and opens per-survey reporting summaries and response tables.',
      'Report detail pages include CSV export and navigation back to Reports or Dashboard.',
      'Admin activity log records edits, role changes, publishing, exports, invite creation, duplication, and deletions with actor and timestamp.'
    ]
  }
];

export function UserGuidePage() {
  const [query, setQuery] = useState('');

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((section) => {
      const text = `${section.title} ${section.content.join(' ')}`.toLowerCase();
      return text.includes(q);
    });
  }, [query]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl">Guide</h1>
      <p>Search by keyword to quickly jump to the guidance you need.</p>

      <label htmlFor="guide-search" className="block max-w-xl">
        <span className="mb-1 block">Search guide</span>
        <input
          id="guide-search"
          className="target-size w-full rounded border border-base-border bg-base-surface px-3"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try: publish, admin, reports, authentication"
        />
      </label>

      <nav aria-label="Guide sections" className="rounded border border-base-border bg-base-surface p-3">
        <p className="mb-2">Sections</p>
        <ul className="list-disc pl-5">
          {filteredSections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      {filteredSections.map((section) => (
        <article id={section.id} key={section.id} className="rounded border border-base-border bg-base-surface p-4">
          <h2 className="text-xl">{section.title}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {section.content.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </article>
      ))}

      {filteredSections.length === 0 && <p>No guide sections match your search.</p>}
    </section>
  );
}
