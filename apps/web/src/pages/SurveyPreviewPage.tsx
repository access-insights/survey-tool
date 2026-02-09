import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Progress } from '../components/Progress';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { shouldShowQuestion } from '../lib/surveyValidation';
import type { Question, SurveyVersion } from '../types';
import { useParams } from 'react-router-dom';

export function SurveyPreviewPage() {
  const { surveyId = '' } = useParams();
  const { token } = useAuth();
  const [status, setStatus] = useState('Loading survey preview...');
  const [version, setVersion] = useState<SurveyVersion | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  useEffect(() => {
    if (!token || !surveyId) return;
    void api
      .getSurveyVersion(token, surveyId)
      .then((result) => {
        setVersion(result.version);
        setStatus('');
      })
      .catch((error: Error) => {
        setStatus(error.message);
      });
  }, [token, surveyId]);

  const visibleQuestions = useMemo(() => {
    if (!version) return [];
    return version.questions.filter((question) => shouldShowQuestion(question, answers));
  }, [version, answers]);

  const completed = useMemo(() => {
    return visibleQuestions.filter((question) => {
      const answer = answers[question.id];
      return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
    }).length;
  }, [answers, visibleQuestions]);

  const setAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const renderQuestion = (question: Question) => {
    const id = question.id;
    const value = answers[id];
    const baseClass = 'target-size w-full rounded border border-base-border bg-base-bg px-2';

    if (question.type === 'single_choice' || question.type === 'yes_no' || question.type === 'likert') {
      const options = question.type === 'yes_no' ? ['Yes', 'No'] : question.options ?? [];
      return (
        <fieldset>
          <legend>{question.label}</legend>
          {question.helpText && <p>{question.helpText}</p>}
          {options.map((option) => (
            <label key={option} className="target-size flex items-center gap-2">
              <input type="radio" name={`${id}-preview`} value={option} checked={value === option} onChange={(e) => setAnswer(id, e.target.value)} />
              {option}
            </label>
          ))}
        </fieldset>
      );
    }

    if (question.type === 'multiple_choice') {
      const options = question.options ?? [];
      const selected = Array.isArray(value) ? value : [];
      return (
        <fieldset>
          <legend>{question.label}</legend>
          {question.helpText && <p>{question.helpText}</p>}
          {options.map((option) => (
            <label key={option} className="target-size flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={(e) => {
                  const next = e.target.checked ? [...selected, option] : selected.filter((item) => item !== option);
                  setAnswer(id, next);
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
          <span className="mb-1 block">{question.label}</span>
          {question.helpText && <p>{question.helpText}</p>}
          <select className={baseClass} value={typeof value === 'string' ? value : ''} onChange={(e) => setAnswer(id, e.target.value)}>
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
          <span className="mb-1 block">{question.label}</span>
          {question.helpText && <p>{question.helpText}</p>}
          <textarea className="w-full rounded border border-base-border bg-base-bg p-2" value={typeof value === 'string' ? value : ''} onChange={(e) => setAnswer(id, e.target.value)} />
        </label>
      );
    }

    if (question.type === 'consent') {
      return (
        <label className="target-size flex items-center gap-2">
          <input type="checkbox" checked={value === 'yes'} onChange={(e) => setAnswer(id, e.target.checked ? 'yes' : '')} />
          {question.label}
        </label>
      );
    }

    return (
      <label className="block">
        <span className="mb-1 block">{question.label}</span>
        {question.helpText && <p>{question.helpText}</p>}
        <input
          type={question.type === 'number' || question.type === 'email' || question.type === 'date' ? question.type : 'text'}
          className={baseClass}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setAnswer(id, e.target.value)}
        />
      </label>
    );
  };

  if (status) return <p role="status">{status}</p>;
  if (!version) return null;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl">{version.title}</h1>
      {version.introText && <p>{version.introText}</p>}
      {version.consentBlurb && <p className="rounded border border-base-border p-3">{version.consentBlurb}</p>}
      <p>Preview mode. Responses are not submitted.</p>
      <Progress completed={completed} total={visibleQuestions.length} />
      <div className="space-y-4 rounded border border-base-border bg-base-surface p-4">
        {visibleQuestions.map((question) => (
          <div key={question.id} className="space-y-1 rounded border border-base-border p-3">
            {renderQuestion(question)}
          </div>
        ))}
      </div>
      <div>
        <Link className="target-size inline-block rounded border border-base-border px-4 py-2" to="/dashboard">
          Back to Dashboard
        </Link>
      </div>
    </section>
  );
}
