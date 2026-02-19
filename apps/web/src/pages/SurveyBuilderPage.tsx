import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { shouldShowQuestion } from '../lib/surveyValidation';
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

const optionQuestionTypes: QuestionType[] = ['single_choice', 'multiple_choice', 'dropdown', 'likert'];
const numericQuestionTypes: QuestionType[] = ['number'];
const textQuestionTypes: QuestionType[] = ['short_text', 'long_text', 'email', 'phone'];
const regexQuestionTypes: QuestionType[] = ['short_text', 'long_text', 'email', 'phone'];

const isOptionType = (type: QuestionType) => optionQuestionTypes.includes(type);
const isNumericType = (type: QuestionType) => numericQuestionTypes.includes(type);
const isTextType = (type: QuestionType) => textQuestionTypes.includes(type);
const isRegexType = (type: QuestionType) => regexQuestionTypes.includes(type);

function normalizeQuestionByType(question: Question, nextType: QuestionType): Question {
  return {
    ...question,
    type: nextType,
    options: isOptionType(nextType) ? (question.options?.length ? question.options : ['Option 1', 'Option 2']) : undefined,
    min: isNumericType(nextType) ? question.min : undefined,
    max: isNumericType(nextType) ? question.max : undefined,
    regex: isRegexType(nextType) ? question.regex : undefined,
    maxLength: isTextType(nextType) ? question.maxLength : undefined,
    randomizeOptions: isOptionType(nextType) ? question.randomizeOptions : false
  };
}

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

function parseEmailList(value: string) {
  const tokens = value
    .split(/[\n,;]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  const deduped = Array.from(new Set(tokens));
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid = deduped.filter((email) => emailRegex.test(email));
  const invalid = deduped.filter((email) => !emailRegex.test(email));
  return { valid, invalid };
}

export function SurveyBuilderPage() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const clonedFromName = new URLSearchParams(location.search).get('clonedFrom') ?? '';
  const { token } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showRegexHelp, setShowRegexHelp] = useState(false);
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [reorderQuestions, setReorderQuestions] = useState<Question[]>([]);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionDialogTitle, setActionDialogTitle] = useState('');
  const [actionDialogLink, setActionDialogLink] = useState('');
  const [previewValues, setPreviewValues] = useState<Record<string, string | string[]>>({});
  const [inviteEmailsText, setInviteEmailsText] = useState('');
  const [inviteExpiresAtLocal, setInviteExpiresAtLocal] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [sendingInviteId, setSendingInviteId] = useState('');
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
    if (!surveyId) {
      setQuestions((current) => (current.length ? current : [makeQuestion()]));
      return;
    }

    if (!token) return;

    void api
      .getSurveyVersion(token, surveyId)
      .then((result) => {
        setQuestions(result.version.questions.length ? result.version.questions : [makeQuestion()]);
        reset({
          title: clonedFromName ? '' : result.version.title,
          description: clonedFromName ? '' : result.version.description,
          introText: result.version.introText,
          consentBlurb: result.version.consentBlurb,
          thankYouText: result.version.thankYouText,
          tags: result.version.tags?.join(', '),
          isTemplate: false
        });
      })
      .catch((error: Error) => setStatus(error.message));
  }, [surveyId, token, reset, clonedFromName]);

  const loadInvites = useCallback(async () => {
    if (!token || !surveyId) return;
    const result = await api.listInvites(token, surveyId);
    setInvites(result.invites);
  }, [token, surveyId]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  const persistDraft = async (values: SurveyForm) => {
    if (!token) return null;

    const preparedQuestions: Question[] = [];
    for (const question of questions) {
      if (!question.addToQuestionBank || !question.label?.trim()) {
        preparedQuestions.push({ ...question, addToQuestionBankForce: false });
        continue;
      }

      try {
        const duplicateCheck = await api.checkQuestionBankDuplicate(token, question.label);
        if (!duplicateCheck.duplicate) {
          preparedQuestions.push({ ...question, addToQuestionBankForce: false });
          continue;
        }

        const keepNew = window.confirm(
          `Possible duplicate found in Question Bank.\nExisting: "${duplicateCheck.duplicate.label}"\nNew: "${question.label}"\n\nSelect OK to keep the new question, or Cancel to discard adding it to the bank.`
        );
        if (keepNew) {
          preparedQuestions.push({ ...question, addToQuestionBankForce: true });
        } else {
          preparedQuestions.push({ ...question, addToQuestionBank: false, addToQuestionBankForce: false });
        }
      } catch {
        preparedQuestions.push({ ...question, addToQuestionBankForce: false });
      }
    }

    const payload = {
      surveyId,
      title: values.title,
      description: values.description,
      introText: values.introText,
      consentBlurb: values.consentBlurb,
      thankYouText: values.thankYouText,
      tags: values.tags?.split(',').map((x) => x.trim()).filter(Boolean),
      questions: preparedQuestions,
      isTemplate: values.isTemplate
    };

    const result = await api.upsertSurvey(token, payload);
    if (!surveyId) {
      navigate(`/builder/${result.surveyId}`, { replace: true });
    }

    return result;
  };

  const previewDraft = handleSubmit(async (values) => {
    await persistDraft(values);
    setShowPreview(true);
    setShowReorderDialog(false);
    setStatus('Draft preview updated');
  });

  const saveDraft = handleSubmit(async (values) => {
    await persistDraft(values);
    setStatus('Draft Saved');
    setActionDialogTitle('Survey Saved');
    setActionDialogLink('');
    setShowActionDialog(true);
  });

  const cloneSurvey = handleSubmit(async (values) => {
    if (!token) return;
    const persisted = await persistDraft(values);
    if (!persisted?.surveyId) return;
    const result = await api.duplicateSurvey(token, persisted.surveyId);
    setStatus('Survey cloned');
    const sourceName = values.title.trim() || 'Untitled survey';
    navigate(`/builder/${result.surveyId}?clonedFrom=${encodeURIComponent(sourceName)}`);
    window.scrollTo({ top: 0, behavior: 'auto' });
  });

  const publishSurvey = handleSubmit(async (values) => {
    if (!token) return;
    const persisted = await persistDraft(values);
    if (!persisted?.surveyId) return;
    await api.publishSurvey(token, persisted.surveyId);
    const inviteResult = await api.createInvite(token, persisted.surveyId);
    if (!surveyId) {
      await navigate(`/builder/${persisted.surveyId}`, { replace: true });
    }
    await loadInvites();
    setStatus('Survey published');
    setActionDialogTitle('Survey Published');
    setActionDialogLink(inviteResult.link);
    setShowActionDialog(true);
  });

  const createBulkInvites = async () => {
    if (!token || !surveyId) return;
    const { valid, invalid } = parseEmailList(inviteEmailsText);
    if (!valid.length) {
      setInviteStatus('Enter at least one valid email address.');
      return;
    }
    setIsSendingInvites(true);
    setInviteStatus('');
    try {
      const expiresAt = inviteExpiresAtLocal ? new Date(inviteExpiresAtLocal).toISOString() : undefined;

      let created = 0;
      for (const email of valid) {
        try {
          await api.createInvite(token, surveyId, expiresAt, email);
          created += 1;
        } catch {
          // Continue through list and report aggregate status.
        }
      }

      await loadInvites();
      const invalidPart = invalid.length ? ` ${invalid.length} invalid email(s) skipped.` : '';
      const failed = valid.length - created;
      const failedPart = failed > 0 ? ` ${failed} failed.` : '';
      setInviteStatus(`Created ${created} invite(s).${failedPart}${invalidPart}`);
    } finally {
      setIsSendingInvites(false);
    }
  };

  const sendSingleInviteEmail = async (invite: Invite) => {
    if (!token) return;
    if (!invite.email) {
      setInviteStatus('Invite has no email address.');
      return;
    }
    setSendingInviteId(invite.id);
    try {
      await api.sendInviteEmail(token, invite.id);
      setInviteStatus(`Invite email sent to ${invite.email}.`);
    } catch (error) {
      setInviteStatus(error instanceof Error ? error.message : 'Failed to send invite email.');
    } finally {
      setSendingInviteId('');
    }
  };

  const cancelReview = () => {
    setShowPreview(false);
    setShowReorderDialog(false);
    setStatus('Draft review closed');
  };

  const moveReorderQuestion = (index: number, nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= reorderQuestions.length) return;
    const updated = [...reorderQuestions];
    const [item] = updated.splice(index, 1);
    updated.splice(nextIndex, 0, item);
    setReorderQuestions(updated);
  };

  const updateQuestion = (id: string, updater: (current: Question) => Question) => {
    setQuestions((current) => current.map((question) => (question.id === id ? updater(question) : question)));
  };

  const removeQuestion = (id: string) => setQuestions((current) => current.filter((question) => question.id !== id));
  const visiblePreviewQuestions = useMemo(
    () => questions.filter((question) => shouldShowQuestion(question, previewValues)),
    [questions, previewValues]
  );

  const setPreviewValue = (questionId: string, value: string | string[]) => {
    setPreviewValues((current) => ({ ...current, [questionId]: value }));
  };
  const currentTitle = watch('title');
  const currentIntroText = watch('introText');
  const currentConsentBlurb = watch('consentBlurb');

  return (
    <section className="space-y-5">
      <h1 className="text-2xl">Survey Builder</h1>
      {clonedFromName ? <p>{`Cloned from ${clonedFromName}`}</p> : null}
      <p aria-live="polite" className="text-sm">
        {status}
      </p>

      <form
        className="space-y-4 rounded border border-base-border bg-base-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div>
          <HelperLabel htmlFor="title" text="Title" helper="Internal title shown in dashboards and invite listings." />
          <input id="title" className="target-size w-full rounded border border-base-border bg-base-bg px-2" {...register('title')} aria-invalid={Boolean(errors.title)} />
          {errors.title && <p className="text-base-danger">Title is required</p>}
        </div>

        <div>
          <HelperLabel
            htmlFor="description"
            text="Description (Does not appear on participant view of the survey)"
            helper="Short summary of survey purpose for your team."
          />
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
                    onChange={(e) => updateQuestion(question.id, (current) => normalizeQuestionByType(current, e.target.value as QuestionType))}
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
                  Required Field
                </label>
                <label className="flex items-center gap-2" title="Mark this answer as personally identifying information.">
                  <input
                    type="checkbox"
                    checked={question.pii ?? false}
                    onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, pii: e.target.checked }))}
                  />
                  Mark as PII
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

              {isOptionType(question.type) && (
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

              {isNumericType(question.type) && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block md:max-w-[12rem]" title="Minimum numeric value accepted.">
                    <span className="mb-1 block">Min</span>
                    <input
                      type="number"
                      className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                      value={question.min ?? ''}
                      onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, min: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </label>

                  <label className="block md:max-w-[12rem]" title="Maximum numeric value accepted.">
                    <span className="mb-1 block">Max</span>
                    <input
                      type="number"
                      className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                      value={question.max ?? ''}
                      onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, max: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </label>
                </div>
              )}

              {isRegexType(question.type) && (
                <label className="block md:max-w-xl" title="Regular expression pattern for text validation, such as ^[A-Za-z]+$.">
                  <span className="mb-1 flex items-center gap-2">
                    <span>Regex</span>
                    <button
                      type="button"
                      className="target-size rounded border border-base-border px-2 py-1 text-sm"
                      aria-haspopup="dialog"
                      onClick={() => setShowRegexHelp(true)}
                    >
                      What is Regex?
                    </button>
                  </span>
                  <input
                    className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                    value={question.regex ?? ''}
                    onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, regex: e.target.value || undefined }))}
                  />
                </label>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                {isOptionType(question.type) && (
                  <label className="flex items-center gap-2" title="Shuffle answer options for each participant.">
                    <input
                      type="checkbox"
                      checked={question.randomizeOptions ?? false}
                      onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, randomizeOptions: e.target.checked }))}
                    />
                    Randomize options
                  </label>
                )}

                {isTextType(question.type) && (
                  <label className="block md:max-w-[12rem]" title="Maximum character count allowed for text responses.">
                    <span className="mb-1 block">Max chars</span>
                    <input
                      type="number"
                      className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                      value={question.maxLength ?? ''}
                      onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, maxLength: e.target.value ? Number(e.target.value) : undefined }))}
                    />
                  </label>
                )}
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

              <label className="target-size flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={question.addToQuestionBank ?? false}
                  onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, addToQuestionBank: e.target.checked }))}
                />
                Add to Question Bank
              </label>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="target-size rounded border border-base-border px-3 py-2" onClick={() => removeQuestion(question.id)}>
                  Discard Question
                </button>
              </div>
            </article>
          ))}

          <div className="pt-1">
            <button type="button" className="target-size rounded border border-base-border px-3 py-2" onClick={() => setQuestions((current) => [...current, makeQuestion()])}>
              Add Next Question
            </button>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="target-size rounded bg-base-action px-4 py-2 text-base-actionText" onClick={() => { void previewDraft(); }}>
            Review Survey Draft
          </button>
        </div>
      </form>

      {surveyId ? (
        <section className="space-y-3 rounded border border-base-border bg-base-surface p-4">
          <h2 className="text-xl">Invite Participants</h2>
          <p className="text-sm text-base-muted">Paste one email per line (or comma-separated). Invites are generated immediately.</p>
          <label className="block">
            <span className="mb-1 block">Participant emails</span>
            <textarea
              className="min-h-32 w-full rounded border border-base-border bg-base-bg p-2"
              value={inviteEmailsText}
              onChange={(e) => setInviteEmailsText(e.target.value)}
              placeholder={'person1@example.com\nperson2@example.com'}
            />
          </label>
          <label className="block max-w-sm">
            <span className="mb-1 block">Optional expiration</span>
            <input
              type="datetime-local"
              className="target-size w-full rounded border border-base-border bg-base-bg px-2"
              value={inviteExpiresAtLocal}
              onChange={(e) => setInviteExpiresAtLocal(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSendingInvites}
              className="target-size rounded bg-base-action px-4 py-2 text-base-actionText disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void createBulkInvites();
              }}
            >
              {isSendingInvites ? 'Creating invites...' : 'Create Invites'}
            </button>
            <button
              type="button"
              className="target-size rounded border border-base-border px-4 py-2"
              onClick={() => {
                void loadInvites();
              }}
            >
              Refresh List
            </button>
          </div>
          <p aria-live="polite" className="text-sm">
            {inviteStatus}
          </p>
          <div className="overflow-x-auto rounded border border-base-border">
            <table className="min-w-full">
              <caption className="sr-only">Invite list</caption>
              <thead>
                <tr>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Expires</th>
                  <th className="p-2 text-left">Created</th>
                  <th className="p-2 text-left">Link</th>
                  <th className="p-2 text-left">Send</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => {
                  const link = `${window.location.origin}/participant/${invite.token}`;
                  return (
                    <tr key={invite.id} className="border-t border-base-border">
                      <td className="p-2">{invite.email || 'No email'}</td>
                      <td className="p-2">{invite.status}</td>
                      <td className="p-2">{invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : 'None'}</td>
                      <td className="p-2">{new Date(invite.createdAt).toLocaleString()}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <a className="break-all underline" href={link}>
                            {link}
                          </a>
                          <button
                            type="button"
                            className="target-size rounded border border-base-border px-2 py-1"
                            onClick={() => {
                              void navigator.clipboard.writeText(link);
                              setInviteStatus('Invite link copied');
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          disabled={!invite.email || sendingInviteId === invite.id}
                          className="target-size rounded border border-base-border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => {
                            void sendSingleInviteEmail(invite);
                          }}
                        >
                          {sendingInviteId === invite.id ? 'Sending...' : 'Send Invite'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {invites.length === 0 ? (
                  <tr>
                    <td className="p-2" colSpan={6}>
                      No invites yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {showRegexHelp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="regex-help-title">
          <div className="w-full max-w-xl rounded border border-base-border bg-base-surface p-4">
            <h2 id="regex-help-title" className="text-xl">Regex help</h2>
            <p>Regex is a text pattern used to validate typed answers.</p>
            <p>Examples:</p>
            <p><code>{'^[A-Za-z]+$'}</code> letters only</p>
            <p><code>{'^[0-9]{5}$'}</code> exactly five digits</p>
            <p><code>{'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'}</code> email pattern</p>
            <button type="button" className="target-size mt-2 rounded border border-base-border px-3 py-2" onClick={() => setShowRegexHelp(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {showPreview && (
        <section className="space-y-3 rounded border border-base-border bg-base-surface p-4">
          <h2 className="text-xl">Review Draft Survey</h2>
          <p className="text-sm">Participant preview mode. This reflects conditional logic and field types.</p>
          <div className="space-y-4 rounded border border-base-border bg-base-bg p-4">
              <h3 className="text-lg">{currentTitle || 'Untitled survey'}</h3>
              {currentIntroText && <p>{currentIntroText}</p>}
              {currentConsentBlurb && <p className="rounded border border-base-border p-3">{currentConsentBlurb}</p>}
              <p className="text-sm text-base-muted">Preview answers are local and not saved.</p>
              {visiblePreviewQuestions.map((question, index) => {
                const value = previewValues[question.id];
                const baseClass = 'target-size w-full rounded border border-base-border bg-base-surface px-2';

                return (
                  <div key={question.id} className="space-y-2 rounded border border-base-border p-3">
                    <p>Question {index + 1}</p>
                    {(question.type === 'single_choice' || question.type === 'yes_no' || question.type === 'likert') && (
                      <fieldset>
                        <legend>{question.label}</legend>
                        {question.helpText && <p id={`${question.id}-preview-help`}>{question.helpText}</p>}
                        {(question.type === 'yes_no' ? ['Yes', 'No'] : question.options ?? []).map((option) => (
                          <label key={option} className="target-size flex items-center gap-2">
                            <input
                              type="radio"
                              name={`${question.id}-preview`}
                              value={option}
                              checked={value === option}
                              onChange={(e) => setPreviewValue(question.id, e.target.value)}
                            />
                            {option}
                          </label>
                        ))}
                      </fieldset>
                    )}

                    {question.type === 'multiple_choice' && (
                      <fieldset>
                        <legend>{question.label}</legend>
                        {question.helpText && <p id={`${question.id}-preview-help`}>{question.helpText}</p>}
                        {(question.options ?? []).map((option) => {
                          const selected = Array.isArray(value) ? value : [];
                          const checked = selected.includes(option);
                          return (
                            <label key={option} className="target-size flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked ? [...selected, option] : selected.filter((item) => item !== option);
                                  setPreviewValue(question.id, next);
                                }}
                              />
                              {option}
                            </label>
                          );
                        })}
                      </fieldset>
                    )}

                    {question.type === 'dropdown' && (
                      <label className="block">
                        <span className="mb-1 block">{question.label}</span>
                        <select className={baseClass} value={typeof value === 'string' ? value : ''} onChange={(e) => setPreviewValue(question.id, e.target.value)}>
                          <option value="">Select one</option>
                          {(question.options ?? []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {question.type === 'long_text' && (
                      <label className="block">
                        <span className="mb-1 block">{question.label}</span>
                        <textarea
                          className="w-full rounded border border-base-border bg-base-surface p-2"
                          value={typeof value === 'string' ? value : ''}
                          onChange={(e) => setPreviewValue(question.id, e.target.value)}
                        />
                      </label>
                    )}

                    {question.type === 'consent' && (
                      <label className="target-size flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={value === 'yes'}
                          onChange={(e) => setPreviewValue(question.id, e.target.checked ? 'yes' : '')}
                        />
                        {question.label}
                      </label>
                    )}

                    {(question.type === 'short_text' ||
                      question.type === 'number' ||
                      question.type === 'email' ||
                      question.type === 'phone' ||
                      question.type === 'date') && (
                      <label className="block">
                        <span className="mb-1 block">{question.label}</span>
                        <input
                          type={question.type === 'email' || question.type === 'date' ? question.type : question.type === 'number' ? 'number' : 'text'}
                          className={baseClass}
                          value={typeof value === 'string' ? value : ''}
                          onChange={(e) => setPreviewValue(question.id, e.target.value)}
                          min={question.min}
                          max={question.max}
                          maxLength={question.maxLength}
                        />
                      </label>
                    )}

                    {question.helpText && <p className="text-sm text-base-muted">{question.helpText}</p>}
                  </div>
                );
              })}
          </div>
          <label className="target-size flex items-center gap-2" title="Save this survey as a reusable template for future projects.">
            <input type="checkbox" {...register('isTemplate')} />
            Save as template
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="target-size rounded bg-base-action px-4 py-2 text-base-actionText" onClick={() => { void saveDraft(); }}>
              Save Draft
            </button>
            <button type="button" className="target-size rounded border border-base-border px-4 py-2" onClick={() => { void cloneSurvey(); }}>
              Clone
            </button>
            <button
              type="button"
              className="target-size rounded border border-base-border px-4 py-2"
              onClick={() => {
                setReorderQuestions(questions);
                setShowReorderDialog(true);
              }}
            >
              Reorder Survey Questions
            </button>
            <button type="button" className="target-size rounded border border-base-border px-4 py-2" onClick={() => { void publishSurvey(); }}>
              Publish
            </button>
            <button type="button" className="target-size rounded border border-base-border px-4 py-2" onClick={cancelReview}>
              Cancel
            </button>
          </div>
        </section>
      )}
      {showReorderDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reorder-title">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col space-y-3 overflow-hidden rounded border border-base-border bg-base-surface p-4">
            <h2 id="reorder-title" className="text-xl">Reorder Survey Questions</h2>
            <div className="space-y-2 overflow-y-auto pr-1">
              {reorderQuestions.map((question, index) => (
                <div key={question.id} className="flex items-center justify-between gap-3 rounded border border-base-border p-3">
                  <p>
                    {index + 1}. {question.label}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" className="target-size rounded border border-base-border px-3 py-2" onClick={() => moveReorderQuestion(index, index - 1)}>
                      Move up
                    </button>
                    <button type="button" className="target-size rounded border border-base-border px-3 py-2" onClick={() => moveReorderQuestion(index, index + 1)}>
                      Move down
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="target-size rounded bg-base-action px-4 py-2 text-base-actionText"
                onClick={() => {
                  setQuestions(reorderQuestions);
                  setShowReorderDialog(false);
                  setStatus('Question order updated');
                }}
              >
                Done
              </button>
              <button
                type="button"
                className="target-size rounded border border-base-border px-4 py-2"
                onClick={() => {
                  setShowReorderDialog(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showActionDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title">
          <div className="w-full max-w-xl space-y-3 rounded border border-base-border bg-base-surface p-4">
            <h2 id="action-dialog-title" className="text-xl">{actionDialogTitle}</h2>
            {actionDialogLink ? (
              <div className="space-y-2">
                <p>
                  Published link:{' '}
                  <a href={actionDialogLink} className="mt-1 block break-all">
                    {actionDialogLink}
                  </a>
                </p>
                <button
                  type="button"
                  className="target-size rounded border border-base-border px-3 py-2"
                  onClick={() => {
                    void navigator.clipboard.writeText(actionDialogLink);
                    setStatus('Published link copied');
                  }}
                >
                  Copy
                </button>
              </div>
            ) : null}
            <button type="button" className="target-size rounded border border-base-border px-3 py-2" onClick={() => setShowActionDialog(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
