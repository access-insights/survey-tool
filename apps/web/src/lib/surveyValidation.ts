import { z } from 'zod';
import type { Question } from '../types';

export function buildSurveySchema(questions: Question[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const q of questions) {
    if (q.type === 'multiple_choice') {
      let field: z.ZodTypeAny = z.array(z.string());
      if (q.required) field = field.refine((value) => value.length > 0, 'Select at least one option');
      shape[q.id] = field;
      continue;
    }

    if (q.type === 'number') {
      shape[q.id] = z
        .string()
        .refine((value) => value.length > 0 || !q.required, 'Required')
        .refine((value) => value.length === 0 || !Number.isNaN(Number(value)), 'Enter a valid number')
        .refine((value) => (value.length === 0 ? true : q.min === undefined || Number(value) >= q.min), `Minimum is ${q.min ?? ''}`)
        .refine((value) => (value.length === 0 ? true : q.max === undefined || Number(value) <= q.max), `Maximum is ${q.max ?? ''}`);
      continue;
    }

    if (q.type === 'email') {
      shape[q.id] = z
        .string()
        .refine((value) => value.length > 0 || !q.required, 'Required')
        .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, 'Enter a valid email');
      continue;
    }

    if (q.type === 'phone') {
      shape[q.id] = z
        .string()
        .refine((value) => value.length > 0 || !q.required, 'Required')
        .refine((value) => value.length === 0 || /^[0-9+()\-\s]{7,20}$/.test(value), 'Enter a valid phone number');
      continue;
    }

    if (q.type === 'date') {
      shape[q.id] = z.string().refine((value) => value.length > 0 || !q.required, 'Required');
      continue;
    }

    let textField = z.string().max(5000);
    if (q.required) textField = textField.min(1, 'Required');
    if (q.maxLength) textField = textField.max(q.maxLength, `Maximum characters is ${q.maxLength}`);
    if (q.regex) textField = textField.regex(new RegExp(q.regex), 'Invalid format');
    shape[q.id] = textField;
  }

  return z.object(shape);
}

export function shouldShowQuestion(question: Question, answers: Record<string, string | string[]>) {
  if (!question.logic) return true;
  const previous = answers[question.logic.questionId];
  if (Array.isArray(previous)) {
    return previous.includes(question.logic.equals);
  }
  return previous === question.logic.equals;
}
