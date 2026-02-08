import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { ErrorSummary } from '../components/ErrorSummary';
import { Progress } from '../components/Progress';
import { api } from '../lib/api';
import { buildSurveySchema, shouldShowQuestion } from '../lib/surveyValidation';
import type { Question, SurveyVersion } from '../types';

export function ParticipantPage() {
  const { inviteToken = '' } = useParams();
  const [version, setVersion] = useState<SurveyVersion | null>(null);
  const [status, setStatus] = useState('Loading survey...');
  const [saved, setSaved] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');

  useEffect(() => {
    api
      .participantLoad(inviteToken)
      .then((result) => {
        setVersion(result.version);
        setStatus('');
      })
      .catch((error: Error) => setStatus(error.message));
  }, [inviteToken]);

  const schema = useMemo(() => buildSurveySchema(version?.questions ?? []), [version]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<Record<string, string | string[]>>({
    resolver: zodResolver(schema),
    defaultValues: {}
  });

  const values = watch();

  useEffect(() => {
    if (!version) return;
    const timer = setTimeout(() => {
      api.participantSaveDraft(inviteToken, values).then(() => setSaved('Draft saved')).catch(() => setSaved(''));
    }, 1000);
    return () => clearTimeout(timer);
  }, [values, inviteToken, version]);

  if (status) return <p role="status">{status}</p>;
  if (!version) return null;

  const visibleQuestions = version.questions.filter((question) => shouldShowQuestion(question, values));
  const completed = visibleQuestions.filter((question) => {
    const answer = values[question.id];
    return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
  }).length;

  const onSubmit = async (answers: Record<string, string | string[]>) => {
    const result = await api.participantSubmit(inviteToken, answers);
    setSubmissionId(result.submissionId);
    setConfirmationCode(result.confirmationCode);
  };

  const errorItems = Object.entries(errors).map(([id, value]) => ({ id, message: value?.message?.toString() ?? 'Invalid answer' }));

  if (submissionId) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">Submission complete</h1>
        <p>{version.thankYouText || 'Thank you for completing this survey.'}</p>
        <p>
          Confirmation code: <strong>{confirmationCode || submissionId}</strong>
        </p>
      </section>
    );
  }

  const renderQuestion = (question: Question) => {
    const id = question.id;
    const baseClass = 'target-size w-full rounded border border-base-border bg-base-bg px-2';

    if (question.type === 'single_choice' || question.type === 'yes_no' || question.type === 'likert') {
      const options = question.type === 'yes_no' ? ['Yes', 'No'] : question.options ?? [];
      return (
        <fieldset>
          <legend className="font-medium">{question.label}</legend>
          {question.helpText && <p id={`${id}-help`}>{question.helpText}</p>}
          {options.map((option) => (
            <label key={option} className="target-size flex items-center gap-2">
              <input type="radio" value={option} {...register(id)} aria-describedby={`${id}-help ${id}-error`} />
              {option}
            </label>
          ))}
        </fieldset>
      );
    }

    if (question.type === 'multiple_choice') {
      const options = question.options ?? [];
      const selected = (values[id] as string[] | undefined) ?? [];
      return (
        <fieldset>
          <legend className="font-medium">{question.label}</legend>
          {question.helpText && <p id={`${id}-help`}>{question.helpText}</p>}
          {options.map((option) => (
            <label key={option} className="target-size flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={(e) => {
                  const next = e.target.checked ? [...selected, option] : selected.filter((item) => item !== option);
                  setValue(id, next, { shouldValidate: true });
                }}
              />
              {option}
            </label>
          ))}
        </fieldset>
      );
    }

    if (question.type === 'dropdown') {
      return (
        <label className="block">
          <span className="mb-1 block font-medium">{question.label}</span>
          <select className={baseClass} {...register(id)} aria-describedby={`${id}-help ${id}-error`}>
            <option value="">Select one</option>
            {(question.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (question.type === 'long_text') {
      return (
        <label className="block">
          <span className="mb-1 block font-medium">{question.label}</span>
          <textarea className="w-full rounded border border-base-border bg-base-bg p-2" {...register(id)} aria-describedby={`${id}-help ${id}-error`} />
        </label>
      );
    }

    if (question.type === 'consent') {
      return (
        <label className="target-size flex items-center gap-2">
          <input type="checkbox" onChange={(e) => setValue(id, e.target.checked ? 'yes' : '', { shouldValidate: true })} />
          {question.label}
        </label>
      );
    }

    return (
      <label className="block">
        <span className="mb-1 block font-medium">{question.label}</span>
        <input
          type={question.type === 'email' || question.type === 'date' ? question.type : 'text'}
          className={baseClass}
          {...register(id)}
          aria-describedby={`${id}-help ${id}-error`}
        />
      </label>
    );
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{version.title}</h1>
      {version.introText && <p>{version.introText}</p>}
      {version.consentBlurb && <p className="rounded border border-base-border p-3">{version.consentBlurb}</p>}
      <p aria-live="polite">{saved}</p>
      <Progress completed={completed} total={visibleQuestions.length} />
      <ErrorSummary errors={errorItems} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded border border-base-border bg-base-surface p-4">
        {visibleQuestions.map((question) => (
          <div key={question.id} id={question.id} className="space-y-1 rounded border border-base-border p-3">
            {renderQuestion(question)}
            {question.helpText && <p id={`${question.id}-help`}>{question.helpText}</p>}
            {errors[question.id] && (
              <p id={`${question.id}-error`} className="text-base-danger">
                {errors[question.id]?.message?.toString()}
              </p>
            )}
          </div>
        ))}
        <button type="submit" disabled={isSubmitting} className="target-size rounded bg-base-action px-4 py-2 text-base-actionText">
          Submit survey
        </button>
      </form>
    </section>
  );
}
