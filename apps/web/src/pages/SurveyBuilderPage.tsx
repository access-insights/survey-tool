import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { shouldShowQuestion } from '../lib/surveyValidation';
import type { Question, QuestionType } from '../types';

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

export function SurveyBuilderPage() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, string | string[]>>({});

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
          title: result.version.title,
          description: result.version.description,
          introText: result.version.introText,
          consentBlurb: result.version.consentBlurb,
          thankYouText: result.version.thankYouText,
          tags: result.version.tags?.join(', '),
          isTemplate: false
        });
      })
      .catch((error: Error) => setStatus(error.message));
  }, [surveyId, token, reset]);

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

  const previewDraft = handleSubmit(async (values) => {
    await persistDraft(values);
    setShowPreview(true);
    setStatus('Draft preview updated');
  });

  const discardDraft = () => {
    const ok = window.confirm('Discard this draft and leave the Survey Builder? Unsaved changes will be lost.');
    if (!ok) return;
    navigate('/dashboard');
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
                  <span className="mb-1 block">Regex</span>
                  <input
                    className="target-size w-full rounded border border-base-border bg-base-bg px-2"
                    value={question.regex ?? ''}
                    onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, regex: e.target.value || undefined }))}
                  />
                </label>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2" title="Mark this answer as personally identifying information.">
                  <input
                    type="checkbox"
                    checked={question.pii ?? false}
                    onChange={(e) => updateQuestion(question.id, (current) => ({ ...current, pii: e.target.checked }))}
                  />
                  Mark as PII
                </label>

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
          <button type="button" className="target-size rounded bg-base-action px-4 py-2 text-base-actionText" onClick={() => { void previewDraft(); }}>
            Review Draft Survey
          </button>
          <button type="button" className="target-size rounded border border-base-border px-4 py-2" onClick={discardDraft}>
            Discard
          </button>
        </div>
      </form>

      {showPreview && (
        <section className="space-y-3 rounded border border-base-border bg-base-surface p-4">
          <h2 className="text-xl">Review Draft Survey</h2>
          <p className="text-sm">Participant preview mode. This reflects conditional logic and field types.</p>

          <div className="space-y-4 rounded border border-base-border bg-base-bg p-4">
            <h3 className="text-lg">{currentTitle || 'Untitled survey'}</h3>
            {currentIntroText && <p>{currentIntroText}</p>}
            {currentConsentBlurb && <p className="rounded border border-base-border p-3">{currentConsentBlurb}</p>}
            <p className="text-sm text-base-muted">Preview answers are local and not saved.</p>
            {visiblePreviewQuestions.map((question) => {
              const value = previewValues[question.id];
              const baseClass = 'target-size w-full rounded border border-base-border bg-base-surface px-2';

              return (
                <div key={question.id} className="space-y-2 rounded border border-base-border p-3">
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
        </section>
      )}
    </section>
  );
}
