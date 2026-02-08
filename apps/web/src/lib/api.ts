import type { AuditEntry, Invite, Survey, SurveyVersion, UserProfile } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || '/.netlify/functions';

export interface ApiError {
  message: string;
}

export async function apiFetch<T>(action: string, token?: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}/api?action=${action}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({ message: 'Unexpected error' }))) as ApiError;
    throw new Error(err.message);
  }

  return (await response.json()) as T;
}

export const api = {
  me: (token: string) => apiFetch<{ user: UserProfile }>('me', token),
  listUsers: (token: string) => apiFetch<{ users: UserProfile[] }>('listUsers', token),
  setRole: (token: string, userId: string, role: string) => apiFetch<{ ok: true }>('setRole', token, { userId, role }),
  listSurveys: (token: string) => apiFetch<{ surveys: Survey[] }>('listSurveys', token),
  deleteSurvey: (token: string, surveyId: string) => apiFetch<{ ok: true }>('deleteSurvey', token, { surveyId }),
  listAudit: (token: string) => apiFetch<{ logs: AuditEntry[] }>('listAudit', token),
  upsertSurvey: (token: string, payload: Partial<SurveyVersion> & { surveyId?: string; isTemplate?: boolean }) =>
    apiFetch<{ surveyId: string; versionId: string }>('upsertSurvey', token, payload),
  publishSurvey: (token: string, surveyId: string) => apiFetch<{ ok: true }>('publishSurvey', token, { surveyId }),
  duplicateSurvey: (token: string, surveyId: string) => apiFetch<{ surveyId: string }>('duplicateSurvey', token, { surveyId }),
  getSurveyVersion: (token: string, surveyId: string) => apiFetch<{ version: SurveyVersion }>('getSurveyVersion', token, { surveyId }),
  listInvites: (token: string, surveyId: string) => apiFetch<{ invites: Invite[] }>('listInvites', token, { surveyId }),
  createInvite: (token: string, surveyId: string, expiresAt?: string, email?: string) =>
    apiFetch<{ invite: Invite; link: string }>('createInvite', token, { surveyId, expiresAt, email }),
  participantLoad: (inviteToken: string) => apiFetch<{ version: SurveyVersion; inviteId: string; draftAnswers: Record<string, string | string[]> }>('participantLoad', undefined, { inviteToken }),
  participantSaveDraft: (inviteToken: string, answers: Record<string, string | string[]>) =>
    apiFetch<{ ok: true }>('participantSaveDraft', undefined, { inviteToken, answers }),
  participantSubmit: (inviteToken: string, answers: Record<string, string | string[]>) =>
    apiFetch<{ submissionId: string }>('participantSubmit', undefined, { inviteToken, answers }),
  reportSummary: (token: string, surveyId: string) => apiFetch<{ summary: Record<string, unknown>; rows: Record<string, unknown>[] }>('reportSummary', token, { surveyId }),
  exportCsv: (token: string, surveyId: string) => apiFetch<{ csv: string }>('exportCsv', token, { surveyId })
};
