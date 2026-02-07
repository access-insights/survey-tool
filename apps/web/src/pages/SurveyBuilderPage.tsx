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

export function SurveyBuilderPage() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [invites, setInvites] = useState<Invite[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
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
    if (!surveyId || !token) return;
    api.getSurveyVersion(token, surveyId).then((result) => {
      setQuestions(result.version.questions);
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

  const saveSurvey = async (values: SurveyForm) => {
    if (!token) return;
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
    setStatus('Draft saved');
    if (!surveyId) navigate(`/builder/${result.surveyId}`, { replace: true });
  };

  const publishSurvey = async () => {
    if (!token || !surveyId) return;
    await api.publishSurvey(token, surveyId);
    setStatus('Survey published');
  };

  const duplicateSurvey = async () => {
    if (!token || !surveyId) return;
    const result = await api.duplicateSurvey(token, surveyId);
    navigate(`/builder/${result.surveyId}`);
  };

  const createInvite = async () => {
    if (!token || !surveyId) return;
    const result = await api.createInvite(token, surveyId);
    setInviteLink(result.link);
    const inviteResult = await api.listInvites(token, surveyId);
    setInvites(inviteResult.invites);
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
      <h1 className="text-2xl font-bold">Survey builder</h1>
      <p aria-live="polite" className="text-sm">
        {status}
      </p>
      <form onSubmit={handleSubmit(saveSurvey)} className="space-y-4 rounded border border-base-border bg-base-surface p-4">
        <div>
          <label htmlFor="title" className="mb-1 block">
            Title
          </label>
          <input id="title" className="target-size w-full rounded border border-base-border bg-base-bg px-2" {...register('title')} aria-invalid={Boolean(errors.title)} />
          {errors.title && <p className="text-base-danger">Title is required</p>}
        </div>
        <div>
          <label htmlFor="description" className="mb-1 block">
            Description
          </label>
          <textarea id="description" className="w-full rounded border border-base-border bg-base-bg p-2" {...register('description')} aria-invalid={Boolean(errors.description)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="introText" className="mb-1 block">
              Intro text
            </label>
            <textarea id="introText" className="w-full rounded border border-base-border bg-base-bg p-2" {...register('introText')} />
          </div>
          <div>
            <label htmlFor="consentBlurb" className="mb-1 block">
              Consent blurb
            </label>
            <textarea id="consentBlurb" className="w-full rounded border border-base-border bg-base-bg p-2" {...register('consentBlurb')} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="thankYouText" className="mb-1 block">
              Thank you text
            </label>
            <textarea id="thankYouText" className="w-full rounded border border-base-border bg-base-bg p-2" {...register('thankYouText')} />
          </div>
          <div>
            <label htmlFor="tags" className="mb-1 block">
              Tags (comma separated)
            </label>
            <input id="tags" className="target-size w-full rounded border border-base-border bg-base-bg px-2" {...register('tags')} />
          </div>
        </div>
        <label className="target-size flex items-center gap-2">
          <input type="checkbox" {...register('isTemplate')} />
          Save as template
        </label>
        <button type="submit" className="target-size rounded bg-base-action px-4 py-2 text-base-actionText">
          Save draft
        </button>
      </form>

      <details className="rounded border border-base-border bg-base-surface p-4">
        <summary className="cursor-pointer font-semibold">Preview current draft</summary>
        <p className="mt-2 text-sm">This preview is read-only and mirrors the current draft question order.</p>
        <ol className="mt-3 list-decimal pl-6">
          {questions.map((question) => (
            <li key={question.id}>
              {question.label} <span className="text-sm text-base-muted">({question.type})</span>
            </li>
          ))}
        </ol>
      </details>

      <section className="space-y-3 rounded border border-base-border bg-base-surface p-4">
        <h2 className="text-xl font-semibold">Questions</h2>
        <button className="target-size rounded border border-base-border px-3 py-2" onClick={() => setQuestions((current) => [...current, makeQuestion()])}>
          Add question
        </button>
        {questions.map((question, index) => (
          <article key={question.id} className="space-y-3 rounded border border-base-border p-3">
            <h3 className="font-semibold">Question {index + 1}</h3>
            <p className="text-xs text-base-muted">Question id: {question.id}</p>
            <label className="block">
              <span className="mb-1 block">Label</span>
              <input
                className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                value={question.label}
                onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, label: e.target.value }))}
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
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
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, required: e.target.checked }))}
                />
                Required
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block">Help text</span>
              <input
                className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                value={question.helpText ?? ''}
                onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, helpText: e.target.value }))}
              />
            </label>
            {optionsQuestionTypes.has(question.type) && (
              <label className="block">
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
              <label className="block">
                <span className="mb-1 block">Min</span>
                <input
                  type="number"
                  className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                  value={question.min ?? ''}
                  onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, min: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block">Max</span>
                <input
                  type="number"
                  className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                  value={question.max ?? ''}
                  onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, max: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block">Regex</span>
                <input
                  className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                  value={question.regex ?? ''}
                  onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, regex: e.target.value || undefined }))}
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={question.pii ?? false}
                  onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, pii: e.target.checked }))}
                />
                Mark as PII
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={question.randomizeOptions ?? false}
                  onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, randomizeOptions: e.target.checked }))}
                />
                Randomize options
              </label>
              <label className="block">
                <span className="mb-1 block">Max chars</span>
                <input
                  type="number"
                  className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                  value={question.maxLength ?? ''}
                  onChange={(e) =>
                    updateQuestion(question.id, (current) => ({ ...current, maxLength: e.target.value ? Number(e.target.value) : undefined }))
                  }
                />
              </label>
            </div>
            <fieldset className="rounded border border-base-border p-2">
              <legend>Conditional logic (single level)</legend>
              <div className="grid gap-3 md:grid-cols-2">
                <label>
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
                <label>
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
      </section>

      <section className="space-y-3 rounded border border-base-border bg-base-surface p-4">
        <h2 className="text-xl font-semibold">Publish and distribution</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="target-size rounded bg-base-action px-3 py-2 text-base-actionText" onClick={publishSurvey} disabled={!surveyId}>
            Publish
          </button>
          <button type="button" className="target-size rounded border border-base-border px-3 py-2" onClick={duplicateSurvey} disabled={!surveyId}>
            Duplicate to draft
          </button>
          <button type="button" className="target-size rounded border border-base-border px-3 py-2" onClick={createInvite} disabled={!surveyId || watch('isTemplate')}>
            Generate invite link
          </button>
        </div>
        {inviteLink && (
          <p>
            Invite link: <a href={inviteLink}>{inviteLink}</a>
          </p>
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
    </section>
  );
}
