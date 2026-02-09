import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Question, QuestionBankItem, QuestionType } from '../types';

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

function makeBankQuestionDraft(): Question {
  return {
    id: crypto.randomUUID(),
    label: '',
    type: 'short_text',
    required: false,
    pii: false,
    randomizeOptions: false
  };
}

function fromQuestionBankItem(item: QuestionBankItem): Question {
  return {
    id: item.id,
    label: item.label,
    type: item.type,
    required: item.required,
    helpText: item.helpText,
    options: item.options,
    min: item.min,
    max: item.max,
    regex: item.regex,
    maxLength: item.maxLength,
    pii: item.pii ?? false,
    randomizeOptions: item.randomizeOptions ?? false,
    logic: item.logic
  };
}

function sanitizeQuestion(question: Question): Question {
  return {
    ...question,
    label: question.label.trim(),
    helpText: question.helpText?.trim() || undefined,
    options: isOptionType(question.type)
      ? (question.options ?? [])
          .map((option) => option.trim())
          .filter(Boolean)
      : undefined,
    min: isNumericType(question.type) ? question.min : undefined,
    max: isNumericType(question.type) ? question.max : undefined,
    regex: isRegexType(question.type) ? question.regex?.trim() || undefined : undefined,
    maxLength: isTextType(question.type) ? question.maxLength : undefined,
    pii: question.pii ?? false,
    randomizeOptions: isOptionType(question.type) ? Boolean(question.randomizeOptions) : false,
    logic: question.logic?.questionId?.trim()
      ? {
          questionId: question.logic.questionId.trim(),
          equals: question.logic.equals ?? ''
        }
      : undefined
  };
}

function QuestionEditor({
  question,
  onChange,
  onOpenRegexHelp
}: {
  question: Question;
  onChange: (next: Question) => void;
  onOpenRegexHelp: () => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block" title="Participant-facing question text.">
        <span className="mb-1 block">Question label</span>
        <input
          className="target-size w-full rounded border border-base-border bg-base-bg px-2"
          value={question.label}
          onChange={(e) => onChange({ ...question, label: e.target.value })}
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block" title="Choose the answer format shown to participants.">
          <span className="mb-1 block">Type</span>
          <select
            className="target-size w-full rounded border border-base-border bg-base-bg px-2"
            value={question.type}
            onChange={(e) => onChange(normalizeQuestionByType(question, e.target.value as QuestionType))}
          >
            {questionTypes.map((questionType) => (
              <option key={questionType.value} value={questionType.value}>
                {questionType.label}
              </option>
            ))}
          </select>
        </label>

        <label className="target-size flex items-center gap-2" title="Require an answer before the participant can submit.">
          <input type="checkbox" checked={question.required} onChange={(e) => onChange({ ...question, required: e.target.checked })} />
          Required field
        </label>

        <label className="target-size flex items-center gap-2" title="Mark this answer as personally identifying information.">
          <input type="checkbox" checked={question.pii ?? false} onChange={(e) => onChange({ ...question, pii: e.target.checked })} />
          Mark as PII
        </label>
      </div>

      <label className="block" title="Optional helper guidance shown below the question.">
        <span className="mb-1 block">Help text (optional)</span>
        <input
          className="target-size w-full rounded border border-base-border bg-base-bg px-2"
          value={question.helpText ?? ''}
          onChange={(e) => onChange({ ...question, helpText: e.target.value })}
        />
      </label>

      {isOptionType(question.type) && (
        <label className="block" title="List answer options, one option per line.">
          <span className="mb-1 block">Options (one per line)</span>
          <textarea
            className="w-full rounded border border-base-border bg-base-bg p-2"
            value={(question.options ?? []).join('\n')}
            onChange={(e) =>
              onChange({
                ...question,
                options: e.target.value
                  .split('\n')
                  .map((value) => value.trim())
                  .filter(Boolean)
              })
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
              onChange={(e) => onChange({ ...question, min: e.target.value ? Number(e.target.value) : undefined })}
            />
          </label>

          <label className="block md:max-w-[12rem]" title="Maximum numeric value accepted.">
            <span className="mb-1 block">Max</span>
            <input
              type="number"
              className="target-size w-full rounded border border-base-border bg-base-bg px-2"
              value={question.max ?? ''}
              onChange={(e) => onChange({ ...question, max: e.target.value ? Number(e.target.value) : undefined })}
            />
          </label>
        </div>
      )}

      {isRegexType(question.type) && (
        <label className="block md:max-w-xl" title="Regular expression pattern for text validation, such as ^[A-Za-z]+$.">
          <span className="mb-1 flex items-center gap-2">
            <span>Regex</span>
            <button type="button" className="target-size rounded border border-base-border px-2 py-1 text-sm" aria-haspopup="dialog" onClick={onOpenRegexHelp}>
              What is Regex?
            </button>
          </span>
          <input
            className="target-size w-full rounded border border-base-border bg-base-bg px-2"
            value={question.regex ?? ''}
            onChange={(e) => onChange({ ...question, regex: e.target.value || undefined })}
          />
        </label>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {isOptionType(question.type) && (
          <label className="target-size flex items-center gap-2" title="Shuffle answer options for each participant.">
            <input
              type="checkbox"
              checked={question.randomizeOptions ?? false}
              onChange={(e) => onChange({ ...question, randomizeOptions: e.target.checked })}
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
              onChange={(e) => onChange({ ...question, maxLength: e.target.value ? Number(e.target.value) : undefined })}
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
                onChange({
                  ...question,
                  logic: e.target.value ? { questionId: e.target.value, equals: question.logic?.equals ?? '' } : undefined
                })
              }
            />
          </label>

          <label title="Answer value required to show this question.">
            <span className="mb-1 block">Expected answer</span>
            <input
              className="target-size w-full rounded border border-base-border bg-base-bg px-2"
              value={question.logic?.equals ?? ''}
              onChange={(e) =>
                onChange({
                  ...question,
                  logic: question.logic ? { ...question.logic, equals: e.target.value } : undefined
                })
              }
            />
          </label>
        </div>
      </fieldset>
    </div>
  );
}

export function QuestionBankPage() {
  const { token, profile } = useAuth();
  const navigate = useNavigate();
  const [bankQuestions, setBankQuestions] = useState<QuestionBankItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  const [newQuestion, setNewQuestion] = useState<Question>(makeBankQuestionDraft());
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [pendingAddQuestion, setPendingAddQuestion] = useState<Question | null>(null);
  const [duplicateQuestion, setDuplicateQuestion] = useState<QuestionBankItem | null>(null);
  const [showAddedDialog, setShowAddedDialog] = useState(false);
  const [showRegexHelp, setShowRegexHelp] = useState(false);

  const loadQuestionBank = useCallback(async () => {
    if (!token) return;
    try {
      const result = await api.listQuestionBank(token);
      setBankQuestions(result.questions);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to load question bank');
    }
  }, [token]);

  useEffect(() => {
    void loadQuestionBank();
  }, [loadQuestionBank]);

  const filtered = useMemo(() => {
    if (!query.trim()) return bankQuestions;
    const q = query.toLowerCase();
    return bankQuestions.filter((question) => `${question.label} ${question.type} ${question.helpText ?? ''} ${question.createdByName}`.toLowerCase().includes(q));
  }, [bankQuestions, query]);

  const toggleSelection = (questionId: string) => {
    setSelectedIds((current) => (current.includes(questionId) ? current.filter((id) => id !== questionId) : [...current, questionId]));
  };

  const addQuestionToBank = async (allowDuplicate = false) => {
    if (!token) return;
    const question = sanitizeQuestion(pendingAddQuestion ?? newQuestion);

    if (question.label.length < 2) {
      setStatus('Enter a question label');
      return;
    }

    try {
      if (!allowDuplicate) {
        const duplicateCheck = await api.checkQuestionBankDuplicate(token, question.label);
        if (duplicateCheck.duplicate) {
          setPendingAddQuestion(question);
          setDuplicateQuestion(duplicateCheck.duplicate);
          return;
        }
      }

      await api.addQuestionToBank(token, question, allowDuplicate);
      setStatus('Question added to bank');
      setNewQuestion(makeBankQuestionDraft());
      setPendingAddQuestion(null);
      setDuplicateQuestion(null);
      setShowAddedDialog(true);
      await loadQuestionBank();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to add question to bank');
    }
  };

  const buildSurvey = async () => {
    if (!token || selectedIds.length === 0) return;
    try {
      const result = await api.buildSurveyFromQuestionBank(token, selectedIds);
      navigate(`/builder/${result.surveyId}`);
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to build survey');
    }
  };

  const startEditQuestion = (question: QuestionBankItem) => {
    setEditingQuestion(question);
    setEditQuestion(fromQuestionBankItem(question));
  };

  const saveEditedQuestion = async () => {
    if (!token || !editingQuestion || !editQuestion) return;
    const question = sanitizeQuestion(editQuestion);
    if (question.label.length < 2) {
      setStatus('Enter a question label');
      return;
    }

    try {
      await api.editQuestionBankQuestion(token, editingQuestion.id, question);
      setStatus('Question updated');
      setEditingQuestion(null);
      setEditQuestion(null);
      await loadQuestionBank();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to update question');
    }
  };

  const archiveQuestion = async (questionId: string, questionLabel: string) => {
    if (!token) return;
    const ok = window.confirm(`Archive question "${questionLabel}"?`);
    if (!ok) return;
    try {
      await api.archiveQuestionBankQuestion(token, questionId);
      setStatus('Question archived');
      setSelectedIds((current) => current.filter((id) => id !== questionId));
      await loadQuestionBank();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to archive question');
    }
  };

  const deleteQuestion = async (questionId: string, questionLabel: string) => {
    if (!token || profile?.role !== 'admin') return;
    const ok = window.confirm(`Delete question "${questionLabel}"? This action cannot be undone.`);
    if (!ok) return;
    try {
      await api.deleteQuestionBankQuestion(token, questionId);
      setStatus('Question deleted');
      setSelectedIds((current) => current.filter((id) => id !== questionId));
      await loadQuestionBank();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to delete question');
    }
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl">Question Bank</h1>
      <p>Choose questions from your bank to build a new survey draft.</p>
      <p aria-live="polite">{status}</p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block min-w-[16rem] flex-1" htmlFor="question-bank-search">
          <span className="mb-1 block">Search question bank</span>
          <input
            id="question-bank-search"
            className="target-size w-full rounded border border-base-border bg-base-bg px-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <a href="#add-question-bank" className="target-size inline-flex items-center rounded border border-base-border px-4 py-2">
          Add New Question
        </a>
      </div>

      <div className="overflow-x-auto rounded border border-base-border bg-base-surface">
        <table className="min-w-full">
          <caption className="sr-only">Question bank list</caption>
          <thead>
            <tr>
              <th className="p-2 text-left">Select</th>
              <th className="p-2 text-left">Question</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Required</th>
              <th className="p-2 text-left">Added by</th>
              <th className="p-2 text-left">Added on</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((question) => (
              <tr key={question.id} className="border-t border-base-border">
                <td className="p-2">
                  <label className="target-size flex items-center gap-2">
                    <input type="checkbox" checked={selectedIds.includes(question.id)} onChange={() => toggleSelection(question.id)} />
                    <span className="sr-only">Select question</span>
                  </label>
                </td>
                <td className="p-2">{question.label}</td>
                <td className="p-2">{question.type}</td>
                <td className="p-2">{question.required ? 'Yes' : 'No'}</td>
                <td className="p-2">{question.createdByName}</td>
                <td className="p-2">{new Date(question.createdAt).toLocaleDateString()}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="target-size rounded border border-base-border px-2 py-1" onClick={() => startEditQuestion(question)}>
                      Edit
                    </button>
                    <button type="button" className="target-size rounded border border-base-border px-2 py-1" onClick={() => { void archiveQuestion(question.id, question.label); }}>
                      Archive
                    </button>
                    {profile?.role === 'admin' && (
                      <button type="button" className="target-size rounded border border-base-border px-2 py-1" onClick={() => { void deleteQuestion(question.id, question.label); }}>
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="target-size rounded bg-base-action px-4 py-2 text-base-actionText disabled:cursor-not-allowed disabled:opacity-60"
          disabled={selectedIds.length === 0}
          onClick={() => {
            void buildSurvey();
          }}
        >
          Build New Survey
        </button>
      </div>

      <section id="add-question-bank" className="space-y-3 rounded border border-base-border bg-base-surface p-4">
        <h2 className="text-xl">Add new question to bank</h2>
        <QuestionEditor question={newQuestion} onChange={setNewQuestion} onOpenRegexHelp={() => setShowRegexHelp(true)} />
        <button type="button" className="target-size rounded border border-base-border px-4 py-2" onClick={() => { void addQuestionToBank(); }}>
          Add to Bank
        </button>
      </section>

      {editingQuestion && editQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-question-title">
          <div className="max-h-[85vh] w-full max-w-2xl space-y-3 overflow-y-auto rounded border border-base-border bg-base-surface p-4">
            <h2 id="edit-question-title" className="text-xl">Edit Question Bank Item</h2>
            <QuestionEditor question={editQuestion} onChange={setEditQuestion} onOpenRegexHelp={() => setShowRegexHelp(true)} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="target-size rounded bg-base-action px-4 py-2 text-base-actionText" onClick={() => { void saveEditedQuestion(); }}>
                Save
              </button>
              <button
                type="button"
                className="target-size rounded border border-base-border px-4 py-2"
                onClick={() => {
                  setEditingQuestion(null);
                  setEditQuestion(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {duplicateQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="duplicate-title">
          <div className="w-full max-w-xl space-y-3 rounded border border-base-border bg-base-surface p-4">
            <h2 id="duplicate-title" className="text-xl">Possible duplicate question</h2>
            <p>An existing question appears similar:</p>
            <p>{duplicateQuestion.label}</p>
            <p>Select Keep New to add your new question anyway, or Discard to keep the existing bank entry only.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="target-size rounded bg-base-action px-4 py-2 text-base-actionText" onClick={() => { void addQuestionToBank(true); }}>
                Keep New
              </button>
              <button
                type="button"
                className="target-size rounded border border-base-border px-4 py-2"
                onClick={() => {
                  setDuplicateQuestion(null);
                  setPendingAddQuestion(null);
                  setStatus('Question add canceled');
                }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddedDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="added-title">
          <div className="w-full max-w-md space-y-3 rounded border border-base-border bg-base-surface p-4">
            <h2 id="added-title" className="text-xl">Question added to bank</h2>
            <button type="button" className="target-size rounded border border-base-border px-4 py-2" onClick={() => setShowAddedDialog(false)}>
              OK
            </button>
          </div>
        </div>
      )}

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
    </section>
  );
}
