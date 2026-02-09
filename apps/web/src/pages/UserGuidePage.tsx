import { useMemo, useState } from 'react';

interface GuideBlock {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface GuideSection {
  id: string;
  title: string;
  intro?: string;
  blocks: GuideBlock[];
}

const sections: GuideSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    intro: 'Access Insights Survey Tool helps internal teams design, publish, and analyze surveys for research and screening workflows.',
    blocks: [
      {
        heading: 'Purpose of the survey tool',
        paragraphs: [
          'The tool provides a single place to create survey drafts, publish invite-based surveys, and review response results.',
          'It supports governance through role-based permissions and activity tracking.'
        ]
      },
      {
        heading: 'Typical use cases',
        bullets: [
          'Research intake and participant screening',
          'Program evaluation and follow-up questionnaires',
          'Internal feedback collection with controlled publishing and reporting'
        ]
      },
      {
        heading: 'High level system concepts',
        bullets: [
          'Draft survey: editable version used during authoring',
          'Published survey: live version available through invite links',
          'Invite link: tokenized participant URL for survey access',
          'Question Bank: reusable question library for consistency',
          'Reports: summary views, response tables, and CSV export',
          'Activity log: action history with actor and timestamp'
        ]
      },
      {
        heading: 'How internal users and external participants interact with the system',
        bullets: [
          'Internal users sign in with Microsoft 365 using an accessinsights.net account.',
          'Role permissions are assigned in the application database and enforced server-side.',
          'External participants do not need Microsoft login and respond through invite links.'
        ]
      }
    ]
  },
  {
    id: 'roles-and-permissions',
    title: 'Roles and Permissions',
    intro: 'Each role has a defined scope so users can perform needed tasks without excess access.',
    blocks: [
      {
        heading: 'Admin',
        bullets: [
          'Manage user roles',
          'View all surveys across the organization',
          'View activity logs',
          'Publish surveys',
          'Delete records where admin rights apply'
        ]
      },
      {
        heading: 'Survey Author',
        bullets: [
          'Create and edit owned surveys',
          'Preview and publish owned surveys',
          'Generate invite links for owned surveys',
          'Review reports for owned surveys'
        ]
      },
      {
        heading: 'Participant',
        bullets: [
          'Open invite-linked surveys',
          'Submit survey responses',
          'No access to internal management pages'
        ]
      },
      {
        heading: 'How restrictions are enforced',
        paragraphs: [
          'Permissions are checked on the server for protected actions, not only in the page interface.',
          'If a user does not have the required role, restricted actions are hidden or blocked.'
        ]
      }
    ]
  },
  {
    id: 'authentication-and-access',
    title: 'Authentication and Access',
    blocks: [
      {
        heading: 'Microsoft 365 authentication for internal users',
        paragraphs: ['Internal staff sign in using Microsoft 365 identity.']
      },
      {
        heading: 'accessinsights.net account requirement',
        paragraphs: ['Internal app access requires an accessinsights.net account.']
      },
      {
        heading: 'Role assignment and enforcement',
        paragraphs: [
          'Roles are assigned in the application database.',
          'Role checks are enforced server-side for protected operations.'
        ]
      },
      {
        heading: 'External participant access via invite links',
        paragraphs: ['Participants use invite links and do not need Microsoft login.']
      },
      {
        heading: 'Security and privacy expectations for participants',
        bullets: [
          'Participants can access only the linked survey scope.',
          'Authors should mark sensitive fields with the PII flag when applicable.',
          'Invite links should be shared only with intended respondents.'
        ]
      }
    ]
  },
  {
    id: 'application-navigation',
    title: 'Application Navigation',
    blocks: [
      {
        heading: 'Dashboard layout and purpose',
        paragraphs: ['Dashboard is the main launch point for survey work, search, and filter-based list review.']
      },
      {
        heading: 'Primary navigation elements',
        bullets: ['Dashboard', 'My Surveys', 'Reports', 'Question Bank', 'Guide', 'Admin (admin only)']
      },
      {
        heading: 'Moving between major views',
        bullets: [
          'Use Dashboard for broad survey visibility and quick actions.',
          'Use My Surveys for author-focused ownership views.',
          'Use Reports to review published survey outcomes.',
          'Use Question Bank to reuse and manage saved questions.',
          'Use Admin for role and audit tasks when authorized.'
        ]
      },
      {
        heading: 'Common navigation patterns and shortcuts',
        bullets: [
          'Use top-level search and filters to narrow large survey lists.',
          'Use row actions for direct navigation to edit, report, archive, or delete based on role.',
          'Use keyboard navigation and the skip link to move quickly to main content.'
        ]
      }
    ]
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    blocks: [
      {
        heading: 'What information appears on the Dashboard',
        paragraphs: ['Dashboard lists surveys with key metadata, status, and available actions by role.']
      },
      {
        heading: 'How surveys are listed and filtered',
        bullets: ['Search field for keyword matching', 'Filter-by dropdown and value selection']
      },
      {
        heading: 'Status indicators',
        bullets: ['Draft', 'Published']
      },
      {
        heading: 'Common actions available from the Dashboard',
        bullets: ['View', 'Edit', 'View Report', 'Archive', 'Delete (admin-only where enforced)']
      }
    ]
  },
  {
    id: 'survey-creation-workflow',
    title: 'Survey Creation Workflow',
    blocks: [
      {
        heading: 'Step by step authoring',
        bullets: [
          'Create a survey from Dashboard.',
          'Enter title, description, intro text, consent text, thank you message, and tags.',
          'Add and configure survey questions.',
          'Use Save draft and Save and add new question during authoring.',
          'Use Preview draft survey before publishing.',
          'Publish when ready and generate invite links.'
        ]
      },
      {
        heading: 'Draft saving behavior and autosave expectations',
        paragraphs: [
          'Save draft is the expected way to persist changes during authoring.',
          'If autosave is not explicitly shown in your environment, do not assume automatic persistence.'
        ]
      },
      {
        heading: 'Previewing a draft survey',
        paragraphs: ['Preview draft survey shows participant-style flow so authors can verify wording, logic, and completion content.']
      }
    ]
  },
  {
    id: 'survey-questions',
    title: 'Survey Questions',
    intro: 'Choose question types based on data needs, respondent effort, and validation requirements.',
    blocks: [
      {
        heading: 'Single choice',
        bullets: ['Use for one answer from a fixed list.', 'Best when options are mutually exclusive.', 'Participant view: one selectable option.']
      },
      {
        heading: 'Multiple choice',
        bullets: ['Use for selecting multiple valid answers.', 'Best for multi-select categories.', 'Participant view: checkbox-style options.']
      },
      {
        heading: 'Short text',
        bullets: ['Use for concise free-text input.', 'Best for names, identifiers, or short labels.', 'Participant view: single-line input.']
      },
      {
        heading: 'Long text',
        bullets: ['Use for detailed narrative input.', 'Best for comments and explanations.', 'Participant view: multi-line text area.']
      },
      {
        heading: 'Number',
        bullets: ['Use for numeric responses.', 'Best when min and max boundaries are needed.', 'Participant view: number field with range checks when configured.']
      },
      {
        heading: 'Email',
        bullets: ['Use for email contact values.', 'Best when follow-up contact is required.', 'Participant view: email-formatted input validation.']
      },
      {
        heading: 'Phone',
        bullets: ['Use for phone contact values.', 'Best for callback or SMS workflows.', 'Participant view: phone input with optional pattern checks.']
      },
      {
        heading: 'Date',
        bullets: ['Use for calendar dates.', 'Best for event, enrollment, or availability dates.', 'Participant view: date picker or date input by platform.']
      },
      {
        heading: 'Dropdown',
        bullets: ['Use for one selection from long option lists.', 'Best when screen space is limited.', 'Participant view: expandable drop-down menu.']
      },
      {
        heading: 'Yes or No',
        bullets: ['Use for binary decisions.', 'Best as a branch trigger for follow-up logic.', 'Participant view: explicit yes or no selection.']
      },
      {
        heading: 'Likert scale',
        bullets: ['Use for attitude or agreement scoring.', 'Best for standardized ordinal responses.', 'Participant view: ordered scale points such as 1 to 5.']
      },
      {
        heading: 'Consent checkbox',
        bullets: ['Use for explicit consent capture.', 'Best when legal or policy acknowledgment is required.', 'Participant view: checkbox linked to consent statement text.']
      }
    ]
  },
  {
    id: 'question-configuration-fields',
    title: 'Question Configuration Fields',
    intro: 'These settings control validation behavior, privacy handling, and survey flow.',
    blocks: [
      {
        heading: 'Required',
        paragraphs: ['Marks the question as mandatory before submission. Example: consent checkbox set to required.']
      },
      {
        heading: 'Help text',
        paragraphs: ['Adds context below the question prompt. Example: "Include country code, for example +1 555 123 4567."']
      },
      {
        heading: 'Minimum and maximum values',
        paragraphs: ['Sets allowed numeric boundaries. Example: Years of experience with min 0 and max 50.']
      },
      {
        heading: 'Regular expression validation',
        paragraphs: ['Applies custom pattern checks. Example: employee code regex ^AI-[0-9]{4}$ to match AI-0001 style values.']
      },
      {
        heading: 'Maximum characters',
        paragraphs: ['Limits text response length. Example: summary field with max 120 characters.']
      },
      {
        heading: 'PII flag and its implications',
        paragraphs: [
          'Marks a field as personally identifiable information for governance awareness.',
          'Example: email or phone questions should typically be marked as PII.'
        ]
      },
      {
        heading: 'Option randomization',
        paragraphs: [
          'Randomizes option order to reduce position bias when order does not carry meaning.',
          'Example: randomize preference choices, but do not randomize ordered severity scales.'
        ]
      },
      {
        heading: 'Conditional logic',
        paragraphs: [
          'Conditional logic shows or hides dependent questions based on prior answers.',
          'Define a source question, set trigger answer values, and connect the follow-up question.'
        ],
        bullets: [
          'Example 1: If "Do you use assistive technology?" is Yes, show "Which assistive technologies do you use?"',
          'Example 2: If preferred contact method is Phone, show "Best time to call"'
        ]
      }
    ]
  },
  {
    id: 'authoring-flow-controls',
    title: 'Authoring Flow Controls',
    blocks: [
      {
        heading: 'Save draft',
        paragraphs: ['Saves current survey progress without publishing.']
      },
      {
        heading: 'Save and add new question',
        paragraphs: ['Saves current question changes and opens a new question form.']
      },
      {
        heading: 'Preview draft survey',
        paragraphs: ['Launches participant-style preview for content and logic validation.']
      },
      {
        heading: 'Common mistakes and how to avoid them',
        bullets: [
          'Missing required settings: confirm required fields for critical prompts.',
          'Over-complex regex: use built-in field types before custom patterns.',
          'Untested branching: validate each conditional path in preview.',
          'Survey fatigue risk: remove low-value questions and keep flow concise.'
        ]
      }
    ]
  },
  {
    id: 'publishing-and-survey-links',
    title: 'Publishing and Survey Links',
    blocks: [
      {
        heading: 'What happens when a survey is published',
        paragraphs: ['Publishing makes the survey available for invite-link access and records a publish event in activity logs.']
      },
      {
        heading: 'Publishing requirements',
        paragraphs: ['Publish is available after required draft setup is complete.']
      },
      {
        heading: 'Audit log behavior',
        paragraphs: ['Publish actions are stored with actor attribution and timestamp.']
      },
      {
        heading: 'Creating invite links',
        paragraphs: ['Use Create survey link to generate invite token URLs.']
      },
      {
        heading: 'Copying and sharing links',
        paragraphs: ['Use Copy next to generated links to share quickly with participants.']
      },
      {
        heading: 'Participant experience when opening a link',
        bullets: [
          'Participant opens invite URL.',
          'Participant completes displayed questions.',
          'Participant submits and receives configured completion messaging.'
        ]
      }
    ]
  },
  {
    id: 'reports-and-results',
    title: 'Reports and Results',
    blocks: [
      {
        heading: 'Reports page overview',
        paragraphs: ['Reports lists published surveys and provides access to detailed reporting pages.']
      },
      {
        heading: 'Per-survey report summaries',
        paragraphs: ['Survey-specific report pages present summary-level insights and response-level data views.']
      },
      {
        heading: 'Response tables',
        paragraphs: ['Response tables provide structured records for review and analysis.']
      },
      {
        heading: 'CSV export behavior',
        paragraphs: ['Report detail pages include CSV export for downstream analysis and retention workflows.']
      },
      {
        heading: 'Navigating between reports and surveys',
        paragraphs: ['Report detail supports navigation back to Reports or Dashboard.']
      }
    ]
  },
  {
    id: 'activity-logs-and-auditing',
    title: 'Activity Logs and Auditing',
    blocks: [
      {
        heading: 'What actions are logged',
        bullets: ['Edits', 'Role changes', 'Publishing', 'Exports', 'Invite creation', 'Duplication', 'Deletions']
      },
      {
        heading: 'Admin visibility into activity logs',
        paragraphs: ['Admins can review organization-level activity history for governance and incident review.']
      },
      {
        heading: 'Typical audit use cases',
        bullets: [
          'Verify who published a survey and when',
          'Confirm when invite links were generated',
          'Track exports and deletion events'
        ]
      },
      {
        heading: 'Timestamps and actor attribution',
        paragraphs: ['Log entries include actor identity and event timestamp.']
      }
    ]
  },
  {
    id: 'question-bank',
    title: 'Question Bank',
    blocks: [
      {
        heading: 'Purpose of the question bank',
        paragraphs: ['Question Bank stores reusable questions to improve consistency, speed, and quality across surveys.']
      },
      {
        heading: 'Reusing questions across surveys',
        paragraphs: ['Authors can select saved questions and build new surveys from chosen bank entries.']
      },
      {
        heading: 'Editing and managing saved questions',
        paragraphs: ['Question Bank provides edit and lifecycle management actions based on role permissions.']
      },
      {
        heading: 'Best practices for consistency',
        bullets: [
          'Use clear labels and stable wording for repeated measures.',
          'Review for near-duplicates before saving new entries.',
          'Archive outdated variants when historical context should be preserved.'
        ]
      }
    ]
  },
  {
    id: 'accessibility-considerations',
    title: 'Accessibility Considerations',
    blocks: [
      {
        heading: 'Screen reader behavior',
        bullets: [
          'Use clear question labels and explicit required indicators.',
          'Keep help text specific and concise.',
          'Write error guidance that explains exactly how to fix input.'
        ]
      },
      {
        heading: 'Keyboard navigation expectations',
        bullets: [
          'All interactive elements should be reachable by keyboard.',
          'Focus order should remain logical in forms and dialogs.',
          'Skip link behavior supports direct movement to main content.'
        ]
      },
      {
        heading: 'High contrast and dark theme support',
        bullets: [
          'Maintain strong color contrast for text and controls.',
          'Do not rely on color alone for required, warning, or error states.',
          'Verify readability in available themes in your environment.'
        ]
      },
      {
        heading: 'Accessible survey design best practices for authors',
        bullets: [
          'Use plain language first, then precise terms when needed.',
          'Ask one concept per question.',
          'Avoid long unnecessary forms that increase fatigue.'
        ]
      }
    ]
  },
  {
    id: 'best-practices-and-tips',
    title: 'Best Practices and Tips',
    blocks: [
      {
        heading: 'Designing effective surveys',
        bullets: [
          'Map every question to a concrete decision or research objective.',
          'Prefer consistent response formats for easier analysis.',
          'Pilot complex surveys with a small internal group first.'
        ]
      },
      {
        heading: 'Avoiding participant fatigue',
        bullets: [
          'Keep surveys concise.',
          'Place highest-value questions early.',
          'Use conditional logic to hide irrelevant follow-ups.'
        ]
      },
      {
        heading: 'Handling sensitive information',
        bullets: [
          'Collect only the PII needed for the study purpose.',
          'Mark PII fields explicitly in question configuration.',
          'Use clear consent language that matches collection intent.'
        ]
      },
      {
        heading: 'Using tags and reports effectively',
        bullets: [
          'Tag surveys by study type, audience, or program area.',
          'Use report summaries for quick checks.',
          'Export CSV for deeper analysis and sharing with approved stakeholders.'
        ]
      }
    ]
  },
  {
    id: 'glossary',
    title: 'Glossary',
    blocks: [
      {
        heading: 'Key terms',
        bullets: [
          'Admin: internal role with organization-level governance permissions.',
          'Survey Author: internal role that creates and manages owned surveys.',
          'Participant: external respondent who accesses surveys via invite links.',
          'Draft: editable survey state before publication.',
          'Published survey: live survey state available for responses.',
          'Invite link: tokenized URL used to access a participant survey.',
          'Question Bank: reusable library of previously authored questions.',
          'PII: personally identifiable information, such as email or phone.',
          'Conditional logic: rules that show or hide questions based on prior answers.',
          'Likert scale: ordered response scale for agreement or frequency.',
          'Activity log: record of key actions with actor and timestamp.',
          'CSV export: downloadable comma-separated output for analysis.'
        ]
      }
    ]
  }
];

export function UserGuidePage() {
  const [query, setQuery] = useState('');

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((section) => {
      const text = [
        section.title,
        section.intro ?? '',
        ...section.blocks.map((block) => block.heading),
        ...section.blocks.flatMap((block) => block.paragraphs ?? []),
        ...section.blocks.flatMap((block) => block.bullets ?? [])
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }, [query]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl">Guide</h1>
      <p>Search by keyword to quickly jump to the guidance you need. This guide supports non-technical and power users.</p>

      <label htmlFor="guide-search" className="block max-w-xl">
        <span className="mb-1 block">Search guide</span>
        <input
          id="guide-search"
          className="target-size w-full rounded border border-base-border bg-base-surface px-3"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try: publish, logic, reports, accessibility"
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
          {section.intro && <p className="mt-2">{section.intro}</p>}
          <div className="mt-3 space-y-4">
            {section.blocks.map((block) => (
              <section key={`${section.id}-${block.heading}`} className="space-y-2">
                <h3 className="text-lg">{block.heading}</h3>
                {block.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {block.bullets && (
                  <ul className="list-disc space-y-1 pl-5">
                    {block.bullets.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </article>
      ))}

      {filteredSections.length === 0 && <p>No guide sections match your search.</p>}
    </section>
  );
}
