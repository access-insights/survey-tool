export type Role = 'admin' | 'creator' | 'participant';

export type SurveyStatus = 'draft' | 'published' | 'archived';

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'dropdown'
  | 'yes_no'
  | 'likert'
  | 'consent';

export interface LogicRule {
  questionId: string;
  equals: string;
}

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  helpText?: string;
  options?: string[];
  min?: number;
  max?: number;
  regex?: string;
  maxLength?: number;
  pii?: boolean;
  randomizeOptions?: boolean;
  logic?: LogicRule;
  addToQuestionBank?: boolean;
}

export interface SurveyVersion {
  id: string;
  surveyId: string;
  version: number;
  isPublished: boolean;
  title: string;
  description: string;
  introText?: string;
  consentBlurb?: string;
  thankYouText?: string;
  tags?: string[];
  questions: Question[];
  createdAt: string;
}

export interface Survey {
  id: string;
  orgId: string;
  ownerUserId: string;
  authorName?: string;
  creatorName?: string;
  lastEditedBy?: string;
  title: string;
  description: string;
  status: SurveyStatus;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  actorUserId?: string;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface Invite {
  id: string;
  surveyId: string;
  token: string;
  email?: string;
  expiresAt?: string;
  status: 'sent' | 'started' | 'completed' | 'expired';
  createdAt: string;
}

export interface QuestionBankItem {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  helpText?: string;
  options?: string[];
  min?: number;
  max?: number;
  regex?: string;
  maxLength?: number;
  pii?: boolean;
  logic?: LogicRule;
  createdByName: string;
  createdAt: string;
}
