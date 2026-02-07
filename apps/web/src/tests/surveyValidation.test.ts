import { describe, expect, it } from 'vitest';
import { buildSurveySchema, shouldShowQuestion } from '../lib/surveyValidation';

describe('survey validation', () => {
  it('validates required and number constraints', () => {
    const schema = buildSurveySchema([
      { id: 'q1', label: 'Age', type: 'number', required: true, min: 18, max: 65 },
      { id: 'q2', label: 'Email', type: 'email', required: true }
    ]);

    const bad = schema.safeParse({ q1: '17', q2: 'invalid' });
    expect(bad.success).toBe(false);

    const good = schema.safeParse({ q1: '25', q2: 'test@example.com' });
    expect(good.success).toBe(true);
  });

  it('applies one-level conditional rules', () => {
    const visible = shouldShowQuestion(
      {
        id: 'q2',
        label: 'Why?',
        type: 'short_text',
        required: false,
        logic: { questionId: 'q1', equals: 'Yes' }
      },
      { q1: 'Yes' }
    );

    const hidden = shouldShowQuestion(
      {
        id: 'q2',
        label: 'Why?',
        type: 'short_text',
        required: false,
        logic: { questionId: 'q1', equals: 'Yes' }
      },
      { q1: 'No' }
    );

    expect(visible).toBe(true);
    expect(hidden).toBe(false);
  });
});
