import { describe, expect, it } from 'vitest';
import { buildFromQuestionBankDefaults, isInviteExpired, resolveStartedAt } from './participantUtils';

describe('participantUtils', () => {
  it('detects expired invites by timestamp', () => {
    const now = new Date('2026-02-19T12:00:00.000Z').getTime();
    expect(isInviteExpired(undefined, now)).toBe(false);
    expect(isInviteExpired(null, now)).toBe(false);
    expect(isInviteExpired('2026-02-19T11:59:59.000Z', now)).toBe(true);
    expect(isInviteExpired('2026-02-19T12:00:01.000Z', now)).toBe(false);
  });

  it('preserves an existing started_at timestamp when present', () => {
    const fallback = '2026-02-19T12:00:00.000Z';
    expect(resolveStartedAt('2026-02-19T11:00:00.000Z', fallback)).toBe('2026-02-19T11:00:00.000Z');
    expect(resolveStartedAt(undefined, fallback)).toBe(fallback);
    expect(resolveStartedAt(null, fallback)).toBe(fallback);
  });

  it('returns non-empty defaults for surveys built from question bank', () => {
    const defaults = buildFromQuestionBankDefaults();
    expect(defaults.title).toBe('New survey');
    expect(defaults.description).toBe('Created from question bank');
  });
});
