import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Invite, Question, QuestionType } from '../types';

const surveySchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  introText: z.string().optional(),
  consentBlurb: z.string().optional(),
  thankYouText: z.string().optional(),
  tags: z.string().optional(),
  isTemplate: z.boolean().default(false)
});

type SurveyForm = z.infer<typeof surveySchema>;

const questionTypes: { value: QuestionType; label: string }[] = [
  { value: 'single_choice', label: 'Single choice' },
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'yes_no', label: 'Yes/No' },
  { value: 'likert', label: 'Likert scale' },
  { value: 'consent', label: 'Consent checkbox' }
];

function makeQuestion(): Question {
  const id = crypto.randomUUID();
  return {
    id,
    label: 'New question',
    type: 'short_text',
    required: false,
    options: ['Option 1', 'Option 2']
  };
}

function HelperLabel({ htmlFor, text, helper }: { htmlFor?: string; text: string; helper: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block" title={helper}>
      <span>{text}</span>
      <span className="sr-only"> {helper}</span>
    </label>
  );
}

export function SurveyBuilderPage() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<SurveyForm>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      title: '',
      description: '',
      introText: '',
      consentBlurb: '',
      thankYouText: '',
      tags: '',
      isTemplate: false
    }
  });

  useEffect(() => {
    if (!surveyId) {
      setQuestions((current) => (current.length ? current : [makeQuestion()]));
      return;
    }

    if (!token) return;

    api.getSurveyVersion(token, surveyId).then((result) => {
      setQuestions(result.version.questions.length ? result.version.questions : [makeQuestion()]);
      setIsPublished(result.version.isPublished);
      reset({
        title: result.version.title,
        description: result.version.description,
        introText: result.version.introText,
        consentBlurb: result.version.consentBlurb,
        thankYouText: result.version.thankYouText,
        tags: result.version.tags?.join(', '),
        isTemplate: false
      });
    });

    api.listInvites(token, surveyId).then((result) => setInvites(result.invites));
  }, [surveyId, token, reset]);

  const optionsQuestionTypes = useMemo(() => new Set(['single_choice', 'multiple_choice', 'dropdown', 'likert']), []);

  const persistDraft = async (values: SurveyForm) => {
    if (!token) return null;

    const payload = {
      surveyId,
      title: values.title,
      description: values.description,
      introText: values.introText,
      consentBlurb: values.consentBlurb,
      thankYouText: values.thankYouText,
      tags: values.tags?.split(',').map((x) => x.trim()).filter(Boolean),
      questions,
      isTemplate: values.isTemplate
    };

    const result = await api.upsertSurvey(token, payload);
    if (!surveyId) {
      navigate(`/builder/${result.surveyId}`, { replace: true });
    }

    return result;
  };

  const saveDraft = handleSubmit(async (values) => {
    await persistDraft(values);
    setStatus('Draft saved');
  });

  const saveAndAddQuestion = handleSubmit(async (values) => {
    await persistDraft(values);
    setQuestions((current) => [...current, makeQuestion()]);
    setStatus('Draft saved and new question added');
  });

  const previewDraft = handleSubmit(async (values) => {
    await persistDraft(values);
    setShowPreview(true);
    setStatus('Draft preview updated');
  });

  const publishSurvey = async () => {
    if (!token || !surveyId) return;
    await api.publishSurvey(token, surveyId);
    setIsPublished(true);
    setStatus('Survey published');
  };

  const createInvite = async () => {
    if (!token || !surveyId) return;
    const result = await api.createInvite(token, surveyId);
    setInviteLink(result.link);
    const inviteResult = await api.listInvites(token, surveyId);
    setInvites(inviteResult.invites);
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setStatus('Survey link copied to clipboard');
  };

  const moveQuestion = (index: number, nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    const updated = [...questions];
    const [item] = updated.splice(index, 1);
    updated.splice(nextIndex, 0, item);
    setQuestions(updated);
  };

  const updateQuestion = (id: string, updater: (current: Question) => Question) => {
    setQuestions((current) => current.map((question) => (question.id === id ? updater(question) : question)));
  };

  const removeQuestion = (id: string) => setQuestions((current) => current.filter((question) => question.id !== id));

  return (
    <section className="space-y-5">
      <h1 className="text-2xl">Survey builder</h1>
      <p aria-live="polite" className="text-sm">
        {status}
      </p>

      <form onSubmit={saveDraft} className="space-y-4 rounded border border-base-border bg-base-surface p-4">
        <div>
          <HelperLabel htmlFor="title" text="Title" helper="Internal title shown in dashboards and invite listings." />
          <input id="title" className="target-size w-full rounded border border-base-border bg-base-bg px-2" {...register('title')} aria-invalid={Boolean(errors.title)} />
          {errors.title && <p className="text-base-danger">Title is required</p>}
        </div>

        <div>
          <HelperLabel htmlFor="description" text="Description" helper="Short summary of survey purpose for your team." />
          <textarea id="description" className="w-full rounded border border-base-border bg-base-bg p-2" {...register('description')} aria-invalid={Boolean(errors.description)} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <HelperLabel htmlFor="introText" text="Intro text" helper="Message participants see before the first question." />
            <textarea id="introText" className="w-full rounded border border-base-border bg-base-bg p-2" {...register('introText')} />
          </div>
          <div>
            <HelperLabel htmlFor="consentBlurb" text="Consent blurb" helper="Optional consent text shown before question content." />
            <textarea id="consentBlurb" className="w-full rounded border border-base-border bg-base-bg p-2" {...register('consentBlurb')} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <HelperLabel htmlFor="thankYouText" text="Thank you text" helper="Message shown after successful submission." />
            <textarea id="thankYouText" className="w-full rounded border border-base-border bg-base-bg p-2" {...register('thankYouText')} />
          </div>
          <div>
            <HelperLabel htmlFor="tags" text="Tags" helper="Comma-separated tags for search and filtering." />
            <input id="tags" className="target-size w-full rounded border border-base-border bg-base-bg px-2" {...register('tags')} />
          </div>
        </div>

        <label className="target-size flex items-center gap-2" title="Save this survey as a reusable template for future projects.">
          <input type="checkbox" {...register('isTemplate')} />
          Save as template
        </label>

        <section className="space-y-3 rounded border border-base-border bg-base-surface p-4">
          <h2 className="text-xl">Questions</h2>
          {questions.map((question, index) => (
            <article key={question.id} className="space-y-3 rounded border border-base-border p-3">
              <h3>Question {index + 1}</h3>

              <label className="block" title="Participant-facing question text.">
                <span className="mb-1 block">Label</span>
                <input
                  className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                  value={question.label}
                  onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, label: e.target.value }))}
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block" title="Choose the answer format shown to participants.">
                  <span className="mb-1 block">Type</span>
                  <select
                    className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                    value={question.type}
                    onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, type: e.target.value as QuestionType }))}
                  >
                    {questionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-2" title="Require an answer before the participant can submit.">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, required: e.target.checked }))}
                  />
                  Required
                </label>
              </div>

              <label className="block" title="Optional helper guidance shown below the question.">
                <span className="mb-1 block">Help text</span>
                <input
                  className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                  value={question.helpText ?? ''}
                  onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, helpText: e.target.value }))}
                />
              </label>

              {optionsQuestionTypes.has(question.type) && (
                <label className="block" title="List answer options, one option per line.">
                  <span className="mb-1 block">Options (one per line)</span>
                  <textarea
                    className="w-full rounded border border-base-border bg-base-bg p-2"
                    value={(question.options ?? []).join('\n')}
                    onChange={(e) =>
                      updateQuestion(question.id, (current) => ({
                        ...current,
                        options: e.target.value
                          .split('\n')
                          .map((x) => x.trim())
                          .filter(Boolean)
                      }))
                    }
                  />
                </label>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <label className="block" title="Minimum numeric value accepted.">
                  <span className="mb-1 block">Min</span>
                  <input
                    type="number"
                    className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                    value={question.min ?? ''}
                    onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, min: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </label>

                <label className="block" title="Maximum numeric value accepted.">
                  <span className="mb-1 block">Max</span>
                  <input
                    type="number"
                    className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                    value={question.max ?? ''}
                    onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, max: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </label>

                <label className="block" title="Regular expression pattern for text validation, such as ^[A-Za-z]+$.">
                  <span className="mb-1 block">Regex</span>
                  <input
                    className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                    value={question.regex ?? ''}
                    onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, regex: e.target.value || undefined }))}
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2" title="Mark this answer as personally identifying information.">
                  <input
                    type="checkbox"
                    checked={question.pii ?? false}
                    onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, pii: e.target.checked }))}
                  />
                  Mark as PII
                </label>

                <label className="flex items-center gap-2" title="Shuffle answer options for each participant.">
                  <input
                    type="checkbox"
                    checked={question.randomizeOptions ?? false}
                    onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, randomizeOptions: e.target.checked }))}
                  />
                  Randomize options
                </label>

                <label className="block" title="Maximum character count allowed for text responses.">
                  <span className="mb-1 block">Max chars</span>
                  <input
                    type="number"
                    className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                    value={question.maxLength ?? ''}
                    onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, maxLength: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </label>
              </div>

              <fieldset className="rounded border border-base-border p-2">
                <legend>Conditional logic (single level)</legend>
                <div className="grid gap-3 md:grid-cols-2">
                  <label title="Question id to evaluate before showing this question.">
                    <span className="mb-1 block">Show when question id equals</span>
                    <input
                      className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                      value={question.logic?.questionId ?? ''}
                      onChange={(e) =>
                        updateQuestion(question.id, (current) => ({
                          ...current,
                          logic: e.target.value ? { questionId: e.target.value, equals: current.logic?.equals ?? '' } : undefined
                        }))
                      }
                    />
                  </label>

                  <label title="Answer value required to show this question.">
                    <span className="mb-1 block">Expected answer</span>
                    <input
                      className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                      value={question.logic?.equals ?? ''}
                      onChange={(e) =>
                        updateQuestion(question.id, (current) => ({
                          ...current,
                          logic: current.logic ? { ...current.logic, equals: e.target.value } : undefined
                        }))
                      }
                    />
                  </label>
                </div>
              </fieldset>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="target-size rounded border border-base-border px-3 py-2" onClick={() => moveQuestion(index, index - 1)}>
                  Move up
                </button>
                <button type="button" className="target-size rounded border border-base-border px-3 py-2" onClick={() => moveQuestion(index, index + 1)}>
                  Move down
                </button>
                <button type="button" className="target-size rounded border border-base-border px-3 py-2" onClick={() => removeQuestion(question.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}

          <div className="pt-1">
            <button type="button" className="target-size rounded border border-base-border px-3 py-2" onClick={() => setQuestions((current) => [...current, makeQuestion()])}>
              Add question
            </button>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="target-size rounded bg-base-action px-4 py-2 text-base-actionText">
            Save draft
          </button>
          <button type="button" className="target-size rounded border border-base-border px-4 py-2" onClick={() => { void saveAndAddQuestion(); }}>
            Save and add new question
          </button>
          <button type="button" className="target-size rounded border border-base-border px-4 py-2" onClick={() => { void previewDraft(); }}>
            Preview draft survey
          </button>
        </div>
      </form>

      {showPreview && (
        <section className="space-y-3 rounded border border-base-border bg-base-surface p-4">
          <h2 className="text-xl">Preview current draft</h2>
          <p className="text-sm">This preview is read-only and mirrors the current question order.</p>
          <ol className="list-decimal pl-6">
            {questions.map((question) => (
              <li key={question.id}>
                {question.label} <span className="text-sm text-base-muted">({question.type})</span>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="target-size rounded bg-base-action px-3 py-2 text-base-actionText" onClick={publishSurvey} disabled={!surveyId}>
              Publish
            </button>
            <button type="button" className="target-size rounded border border-base-border px-3 py-2" onClick={createInvite} disabled={!surveyId || !isPublished}>
              Create survey link
            </button>
          </div>

          {inviteLink && (
            <div className="flex flex-wrap items-center gap-2">
              <p>
                Share link: <a href={inviteLink}>{inviteLink}</a>
              </p>
              <button type="button" className="target-size rounded border border-base-border px-3 py-1" onClick={() => { void copyInviteLink(); }}>
                Copy
              </button>
            </div>
          )}

          {invites.length > 0 && (
            <div className="overflow-x-auto rounded border border-base-border">
              <table className="min-w-full">
                <caption className="sr-only">Invite list</caption>
                <thead>
                  <tr>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => (
                    <tr key={invite.id} className="border-t border-base-border">
                      <td className="p-2">{invite.status}</td>
                      <td className="p-2">{invite.email || 'N/A'}</td>
                      <td className="p-2">{invite.expiresAt || 'No expiration'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
