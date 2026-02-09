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
const isOptionType = (type: QuestionType) => optionQuestionTypes.includes(type);

export function QuestionBankPage() {
  const { token, profile } = useAuth();
  const navigate = useNavigate();
  const [bankQuestions, setBankQuestions] = useState<QuestionBankItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  const [label, setLabel] = useState('');
  const [type, setType] = useState<QuestionType>('short_text');
  const [required, setRequired] = useState(false);
  const [helpText, setHelpText] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editType, setEditType] = useState<QuestionType>('short_text');
  const [editRequired, setEditRequired] = useState(false);
  const [editHelpText, setEditHelpText] = useState('');
  const [editOptionsText, setEditOptionsText] = useState('');

  const loadQuestionBank = useCallback(async () => {
    if (!token) return;
    const result = await api.listQuestionBank(token);
    setBankQuestions(result.questions);
  }, [token]);

  useEffect(() => {
    void loadQuestionBank();
  }, [loadQuestionBank]);

  const filtered = useMemo(() => {
    if (!query.trim()) return bankQuestions;
    const q = query.toLowerCase();
    return bankQuestions.filter((question) => `${question.label} ${question.type} ${question.createdByName}`.toLowerCase().includes(q));
  }, [bankQuestions, query]);

  const toggleSelection = (questionId: string) => {
    setSelectedIds((current) => (current.includes(questionId) ? current.filter((id) => id !== questionId) : [...current, questionId]));
  };

  const addQuestionToBank = async () => {
    if (!token) return;
    if (label.trim().length < 2) {
      setStatus('Enter a question label');
      return;
    }

    const question: Question = {
      id: crypto.randomUUID(),
      label: label.trim(),
      type,
      required,
      helpText: helpText.trim() || undefined,
      options: isOptionType(type)
        ? optionsText
            .split('\n')
            .map((x) => x.trim())
            .filter(Boolean)
        : undefined
    };

    await api.addQuestionToBank(token, question);
    setStatus('Question added to bank');
    setLabel('');
    setType('short_text');
    setRequired(false);
    setHelpText('');
    setOptionsText('');
    await loadQuestionBank();
  };

  const buildSurvey = async () => {
    if (!token || selectedIds.length === 0) return;
    const result = await api.buildSurveyFromQuestionBank(token, selectedIds);
    navigate(`/builder/${result.surveyId}`);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const startEditQuestion = (question: QuestionBankItem) => {
    setEditingQuestion(question);
    setEditLabel(question.label);
    setEditType(question.type);
    setEditRequired(question.required);
    setEditHelpText(question.helpText ?? '');
    setEditOptionsText((question.options ?? []).join('\n'));
  };

  const saveEditedQuestion = async () => {
    if (!token || !editingQuestion) return;
    if (editLabel.trim().length < 2) {
      setStatus('Enter a question label');
      return;
    }
    const question: Question = {
      id: editingQuestion.id,
      label: editLabel.trim(),
      type: editType,
      required: editRequired,
      helpText: editHelpText.trim() || undefined,
      options: isOptionType(editType)
        ? editOptionsText
            .split('\n')
            .map((x) => x.trim())
            .filter(Boolean)
        : undefined
    };
    await api.editQuestionBankQuestion(token, editingQuestion.id, question);
    setStatus('Question updated');
    setEditingQuestion(null);
    await loadQuestionBank();
  };

  const archiveQuestion = async (questionId: string, questionLabel: string) => {
    if (!token) return;
    const ok = window.confirm(`Archive question "${questionLabel}"?`);
    if (!ok) return;
    await api.archiveQuestionBankQuestion(token, questionId);
    setStatus('Question archived');
    setSelectedIds((current) => current.filter((id) => id !== questionId));
    await loadQuestionBank();
  };

  const deleteQuestion = async (questionId: string, questionLabel: string) => {
    if (!token || profile?.role !== 'admin') return;
    const ok = window.confirm(`Delete question "${questionLabel}"? This action cannot be undone.`);
    if (!ok) return;
    await api.deleteQuestionBankQuestion(token, questionId);
    setStatus('Question deleted');
    setSelectedIds((current) => current.filter((id) => id !== questionId));
    await loadQuestionBank();
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl">Question Bank</h1>
      <p>Choose questions from your bank to build a new survey draft.</p>
      <p aria-live="polite">{status}</p>

      <section className="space-y-3 rounded border border-base-border bg-base-surface p-4">
        <h2 className="text-xl">Add new question to bank</h2>
        <label className="block">
          <span className="mb-1 block">Question label</span>
          <input className="target-size w-full rounded border border-base-border bg-base-bg px-2" value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block">Type</span>
            <select className="target-size w-full rounded border border-base-border bg-base-bg px-2" value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
              {questionTypes.map((questionType) => (
                <option key={questionType.value} value={questionType.value}>
                  {questionType.label}
                </option>
              ))}
            </select>
          </label>
          <label className="target-size flex items-center gap-2">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            Required field
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block">Help text (optional)</span>
          <input className="target-size w-full rounded border border-base-border bg-base-bg px-2" value={helpText} onChange={(e) => setHelpText(e.target.value)} />
        </label>
        {isOptionType(type) && (
          <label className="block">
            <span className="mb-1 block">Options (one per line)</span>
            <textarea className="w-full rounded border border-base-border bg-base-bg p-2" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
          </label>
        )}
        <button type="button" className="target-size rounded border border-base-border px-4 py-2" onClick={() => { void addQuestionToBank(); }}>
          Add New Question
        </button>
      </section>

      <label className="block max-w-lg" htmlFor="question-bank-search">
        <span className="mb-1 block">Search question bank</span>
        <input
          id="question-bank-search"
          className="target-size w-full rounded border border-base-border bg-base-bg px-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

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
          onClick={() => { void buildSurvey(); }}
        >
          Build New Survey
        </button>
      </div>
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-question-title">
          <div className="w-full max-w-2xl space-y-3 rounded border border-base-border bg-base-surface p-4">
            <h2 id="edit-question-title" className="text-xl">Edit Question Bank Item</h2>
            <label className="block">
              <span className="mb-1 block">Question label</span>
              <input className="target-size w-full rounded border border-base-border bg-base-bg px-2" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block">Type</span>
                <select className="target-size w-full rounded border border-base-border bg-base-bg px-2" value={editType} onChange={(e) => setEditType(e.target.value as QuestionType)}>
                  {questionTypes.map((questionType) => (
                    <option key={questionType.value} value={questionType.value}>
                      {questionType.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="target-size flex items-center gap-2">
                <input type="checkbox" checked={editRequired} onChange={(e) => setEditRequired(e.target.checked)} />
                Required field
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block">Help text (optional)</span>
              <input className="target-size w-full rounded border border-base-border bg-base-bg px-2" value={editHelpText} onChange={(e) => setEditHelpText(e.target.value)} />
            </label>
            {isOptionType(editType) && (
              <label className="block">
                <span className="mb-1 block">Options (one per line)</span>
                <textarea className="w-full rounded border border-base-border bg-base-bg p-2" value={editOptionsText} onChange={(e) => setEditOptionsText(e.target.value)} />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="target-size rounded bg-base-action px-4 py-2 text-base-actionText" onClick={() => { void saveEditedQuestion(); }}>
                Save
              </button>
              <button type="button" className="target-size rounded border border-base-border px-4 py-2" onClick={() => setEditingQuestion(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
