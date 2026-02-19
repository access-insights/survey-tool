export function isInviteExpired(expiresAt?: string | null, nowMs = Date.now()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < nowMs;
}

export function resolveStartedAt(existingStartedAt?: string | null, fallbackNowIso = new Date().toISOString()): string {
  return existingStartedAt || fallbackNowIso;
}

export function buildFromQuestionBankDefaults() {
  return {
    title: 'New survey',
    description: 'Created from question bank'
  };
}
