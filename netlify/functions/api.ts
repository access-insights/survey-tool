import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { z } from 'zod';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowedEmailDomain = (process.env.ALLOWED_EMAIL_DOMAIN || 'accessinsights.net').toLowerCase();
const azureAllowedTenantId = process.env.AZURE_ALLOWED_TENANT_ID;
const azureAllowedAudience = process.env.AZURE_ALLOWED_AUDIENCE;
const azureIssuer = process.env.AZURE_ISSUER;
const azureJwksUri = process.env.AZURE_JWKS_URI;
const adminBootstrapEmails = (process.env.ADMIN_BOOTSTRAP_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});
const azureJwks = azureJwksUri ? createRemoteJWKSet(new URL(azureJwksUri)) : null;

type Role = 'admin' | 'creator' | 'participant';

interface AuthContext {
  userId: string;
  email: string;
  role: Role;
  orgId: string;
}

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  },
  body: JSON.stringify(body)
});

const bodyParser = (raw: string | null) => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const roleGuard = (ctx: AuthContext, allowed: Role[]) => {
  if (!allowed.includes(ctx.role)) {
    throw new Error('Forbidden');
  }
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

const rateLimit = (bucket: string, max: number, windowMs: number) => {
  const now = Date.now();
  const current = rateBuckets.get(bucket);
  if (!current || now > current.resetAt) {
    rateBuckets.set(bucket, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= max) {
    throw new Error('Too many requests, retry later');
  }
  current.count += 1;
  rateBuckets.set(bucket, current);
};

const resolveOrgId = async () => {
  const preferredOrgId = process.env.DEFAULT_ORG_ID;
  if (preferredOrgId) return preferredOrgId;

  const { data: existingOrg } = await supabase.from('organizations').select('id').limit(1).maybeSingle();
  if (existingOrg?.id) return existingOrg.id;

  const { data: createdOrg, error: createOrgError } = await supabase
    .from('organizations')
    .insert({ name: 'Access Insights' })
    .select('id')
    .single();

  if (createOrgError || !createdOrg) {
    throw new Error('Failed to resolve organization');
  }
  return createdOrg.id;
};

const parseIdentity = (payload: JWTPayload) => {
  const claims = payload as JWTPayload & Record<string, unknown>;
  const subject = String(claims.oid || claims.sub || '');
  const email = String(claims.preferred_username || claims.email || claims.upn || '').toLowerCase();
  const fullName = String(payload.name || '').trim();
  const tenantId = String(claims.tid || '');

  if (!subject) throw new Error('Missing subject claim');
  if (!email) throw new Error('Missing email claim');
  if (!email.endsWith(`@${allowedEmailDomain}`)) {
    throw new Error(`Only @${allowedEmailDomain} accounts are allowed`);
  }
  if (azureAllowedTenantId && tenantId !== azureAllowedTenantId) {
    throw new Error('Invalid tenant');
  }

  return { subject, email, fullName };
};

const requireAuth = async (authorization: string | undefined): Promise<AuthContext> => {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new Error('Missing authorization token');
  }
  if (!azureAllowedAudience || !azureIssuer || !azureJwks) {
    throw new Error('Missing Azure auth environment variables');
  }

  const token = authorization.replace('Bearer ', '');
  const { payload } = await jwtVerify(token, azureJwks, {
    issuer: azureIssuer,
    audience: azureAllowedAudience
  });

  const identity = parseIdentity(payload);
  const orgId = await resolveOrgId();
  const defaultRole: Role = adminBootstrapEmails.includes(identity.email) ? 'admin' : 'creator';

  const { data: userRow, error } = await supabase
    .from('users')
    .select('id,email,role,org_id')
    .eq('id', identity.subject)
    .maybeSingle();

  if (!userRow) {
    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert({
        id: identity.subject,
        org_id: orgId,
        email: identity.email,
        full_name: identity.fullName || identity.email,
        role: defaultRole
      })
      .select('id,email,role,org_id')
      .single();

    if (insertError || !inserted) {
      throw new Error('Failed to create user profile');
    }
    return {
      userId: inserted.id,
      email: inserted.email,
      role: inserted.role,
      orgId: inserted.org_id
    };
  }

  if (error) throw new Error(error.message);

  // Keep name/email in sync for convenience.
  await supabase
    .from('users')
    .update({ email: identity.email, full_name: identity.fullName || identity.email })
    .eq('id', userRow.id);

  return {
    userId: userRow.id,
    email: identity.email,
    role: userRow.role,
    orgId: userRow.org_id
  };
};

const recordAudit = async (ctx: AuthContext, action: string, resourceType: string, resourceId: string, details: Record<string, unknown> = {}) => {
  await supabase.from('audit_log').insert({
    org_id: ctx.orgId,
    actor_user_id: ctx.userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details
  });
};

const ensureSurveyAccess = async (ctx: AuthContext, surveyId: string) => {
  const { data: survey, error } = await supabase
    .from('surveys')
    .select('id, owner_user_id, org_id')
    .eq('id', surveyId)
    .single();

  if (error || !survey) throw new Error('Survey not found');

  if (ctx.role !== 'admin' && survey.owner_user_id !== ctx.userId) {
    throw new Error('Forbidden');
  }

  return survey;
};

const upsertSurveySchema = z.object({
  surveyId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().min(3).max(2000),
  introText: z.string().max(5000).optional(),
  consentBlurb: z.string().max(5000).optional(),
  thankYouText: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).optional(),
  questions: z.array(
    z.object({
      id: z.string(),
      label: z.string().max(1000),
      type: z.string(),
      required: z.boolean(),
      helpText: z.string().optional(),
      options: z.array(z.string()).optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      regex: z.string().optional(),
      maxLength: z.number().optional(),
      pii: z.boolean().optional(),
      randomizeOptions: z.boolean().optional(),
      logic: z
        .object({
          questionId: z.string(),
          equals: z.string()
        })
        .optional()
    })
  ),
  isTemplate: z.boolean().optional()
});

const inviteSchema = z.object({
  surveyId: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
  email: z.string().email().optional()
});

const participantSchema = z.object({
  inviteToken: z.string().min(20),
  answers: z.record(z.union([z.string().max(5000), z.array(z.string().max(5000))]))
});

const participantLoadSchema = z.object({
  inviteToken: z.string().min(20)
});

function csvEscape(value: unknown) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export const handler: Handler = async (event) => {
  try {
    const action = event.queryStringParameters?.action;

    if (!action) {
      return json(400, { message: 'Missing action' });
    }

    const body = bodyParser(event.body);

    if (action === 'participantLoad') {
      const input = participantLoadSchema.parse(body);
      rateLimit(`load:${input.inviteToken}`, 120, 60_000);

      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('id, survey_id, status, expires_at')
        .eq('token', input.inviteToken)
        .single();

      if (inviteError || !invite) throw new Error('Invite not found');
      if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) throw new Error('Invite expired');

      const { data: version, error: versionError } = await supabase
        .from('survey_versions')
        .select('*')
        .eq('survey_id', invite.survey_id)
        .eq('is_published', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (versionError || !version) throw new Error('Published survey version missing');

      const { data: existingResponse } = await supabase
        .from('responses')
        .select('id,status,answers_json')
        .eq('invite_id', invite.id)
        .maybeSingle();

      if (invite.status === 'sent') {
        await supabase.from('invites').update({ status: 'started' }).eq('id', invite.id);
      }

      return json(200, {
        version: {
          id: version.id,
          surveyId: version.survey_id,
          version: version.version,
          isPublished: version.is_published,
          title: version.title,
          description: version.description,
          introText: version.intro_text,
          consentBlurb: version.consent_blurb,
          thankYouText: version.thank_you_text,
          tags: version.tags,
          questions: version.questions_json,
          createdAt: version.created_at
        },
        inviteId: invite.id,
        draftAnswers: existingResponse?.answers_json ?? {}
      });
    }

    if (action === 'participantSaveDraft') {
      const input = participantSchema.parse(body);
      rateLimit(`draft:${input.inviteToken}`, 30, 60_000);

      const { data: invite, error } = await supabase.from('invites').select('id,status').eq('token', input.inviteToken).single();
      if (error || !invite) throw new Error('Invite not found');
      if (invite.status === 'completed') throw new Error('Survey already submitted');

      const { data: existing } = await supabase.from('responses').select('id').eq('invite_id', invite.id).maybeSingle();

      if (existing) {
        await supabase.from('responses').update({ answers_json: input.answers, status: 'draft', updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await supabase.from('responses').insert({ invite_id: invite.id, status: 'draft', answers_json: input.answers, started_at: new Date().toISOString() });
      }

      return json(200, { ok: true });
    }

    if (action === 'participantSubmit') {
      const input = participantSchema.parse(body);
      rateLimit(`submit:${input.inviteToken}`, 10, 60_000);

      const { data: invite, error } = await supabase
        .from('invites')
        .select('id,survey_id,status')
        .eq('token', input.inviteToken)
        .single();

      if (error || !invite) throw new Error('Invite not found');
      if (invite.status === 'completed') throw new Error('Survey already submitted');

      const startedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();

      const { data: response, error: responseError } = await supabase
        .from('responses')
        .upsert(
          {
            invite_id: invite.id,
            survey_id: invite.survey_id,
            status: 'completed',
            answers_json: input.answers,
            started_at: startedAt,
            completed_at: completedAt
          },
          { onConflict: 'invite_id' }
        )
        .select('id')
        .single();

      if (responseError || !response) throw new Error('Failed to submit');

      await supabase.from('invites').update({ status: 'completed' }).eq('id', invite.id);

      const webhook = process.env.WEBHOOK_COMPLETION_URL;
      if (webhook) {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ surveyId: invite.survey_id, responseId: response.id })
        }).catch(() => undefined);
      }

      return json(200, { submissionId: response.id });
    }

    const ctx = await requireAuth(event.headers.authorization);

    if (action === 'me') {
      const { data: user } = await supabase.from('users').select('id,email,full_name,role').eq('id', ctx.userId).single();
      return json(200, {
        user: {
          id: user?.id,
          email: user?.email,
          fullName: user?.full_name,
          role: user?.role
        }
      });
    }

    if (action === 'listUsers') {
      roleGuard(ctx, ['admin']);
      const { data, error } = await supabase.from('users').select('id,email,full_name,role').eq('org_id', ctx.orgId).order('email');
      if (error) throw new Error(error.message);
      return json(200, {
        users: (data ?? []).map((user) => ({
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        }))
      });
    }

    if (action === 'setRole') {
      roleGuard(ctx, ['admin']);
      const input = z.object({ userId: z.string().uuid(), role: z.enum(['admin', 'creator', 'participant']) }).parse(body);

      await supabase.from('users').update({ role: input.role }).eq('id', input.userId).eq('org_id', ctx.orgId);
      await recordAudit(ctx, 'set_role', 'user', input.userId, { role: input.role });
      return json(200, { ok: true });
    }

    if (action === 'listSurveys') {
      roleGuard(ctx, ['admin', 'creator', 'participant']);
      let query = supabase.from('surveys').select('*').eq('org_id', ctx.orgId).order('updated_at', { ascending: false });
      if (ctx.role === 'creator') {
        query = query.eq('owner_user_id', ctx.userId);
      }
      if (ctx.role === 'participant') {
        query = query.eq('status', 'published');
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return json(200, {
        surveys: (data ?? []).map((row) => ({
          id: row.id,
          orgId: row.org_id,
          ownerUserId: row.owner_user_id,
          title: row.title,
          description: row.description,
          status: row.status,
          isTemplate: row.is_template,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
      });
    }

    if (action === 'upsertSurvey') {
      roleGuard(ctx, ['admin', 'creator']);
      const input = upsertSurveySchema.parse(body);
      const now = new Date().toISOString();

      let surveyId = input.surveyId;
      if (!surveyId) {
        const { data: createdSurvey, error: createError } = await supabase
          .from('surveys')
          .insert({
            org_id: ctx.orgId,
            owner_user_id: ctx.userId,
            title: input.title,
            description: input.description,
            status: 'draft',
            is_template: input.isTemplate ?? false,
            created_at: now,
            updated_at: now
          })
          .select('id')
          .single();

        if (createError || !createdSurvey) throw new Error('Failed to create survey');
        surveyId = createdSurvey.id;
      } else {
        await ensureSurveyAccess(ctx, surveyId);
        await supabase
          .from('surveys')
          .update({ title: input.title, description: input.description, is_template: input.isTemplate ?? false, updated_at: now })
          .eq('id', surveyId);
      }

      const { data: currentVersion } = await supabase
        .from('survey_versions')
        .select('version')
        .eq('survey_id', surveyId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (currentVersion?.version ?? 0) + 1;

      const { data: version, error: versionError } = await supabase
        .from('survey_versions')
        .insert({
          survey_id: surveyId,
          version: nextVersion,
          is_published: false,
          title: input.title,
          description: input.description,
          intro_text: input.introText,
          consent_blurb: input.consentBlurb,
          thank_you_text: input.thankYouText,
          tags: input.tags ?? [],
          questions_json: input.questions,
          created_by: ctx.userId
        })
        .select('id')
        .single();

      if (versionError || !version) throw new Error('Failed to save version');

      await recordAudit(ctx, 'upsert_survey', 'survey', surveyId, { version: nextVersion });
      return json(200, { surveyId, versionId: version.id });
    }

    if (action === 'publishSurvey') {
      roleGuard(ctx, ['admin', 'creator']);
      const input = z.object({ surveyId: z.string().uuid() }).parse(body);
      await ensureSurveyAccess(ctx, input.surveyId);

      const { data: version } = await supabase
        .from('survey_versions')
        .select('id')
        .eq('survey_id', input.surveyId)
        .eq('is_published', false)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (!version) throw new Error('No draft version available');

      await supabase.from('survey_versions').update({ is_published: false }).eq('survey_id', input.surveyId);
      await supabase.from('survey_versions').update({ is_published: true }).eq('id', version.id);
      await supabase.from('surveys').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', input.surveyId);
      await recordAudit(ctx, 'publish_survey', 'survey', input.surveyId);

      return json(200, { ok: true });
    }

    if (action === 'duplicateSurvey') {
      roleGuard(ctx, ['admin', 'creator']);
      const input = z.object({ surveyId: z.string().uuid() }).parse(body);
      await ensureSurveyAccess(ctx, input.surveyId);

      const { data: latestVersion, error } = await supabase
        .from('survey_versions')
        .select('*')
        .eq('survey_id', input.surveyId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error || !latestVersion) throw new Error('Source survey version not found');

      const now = new Date().toISOString();
      const { data: createdSurvey, error: createError } = await supabase
        .from('surveys')
        .insert({
          org_id: ctx.orgId,
          owner_user_id: ctx.userId,
          title: `${latestVersion.title} (copy)`,
          description: latestVersion.description,
          status: 'draft',
          is_template: false,
          created_at: now,
          updated_at: now
        })
        .select('id')
        .single();

      if (createError || !createdSurvey) throw new Error('Failed to duplicate survey');

      await supabase.from('survey_versions').insert({
        survey_id: createdSurvey.id,
        version: 1,
        is_published: false,
        title: `${latestVersion.title} (copy)`,
        description: latestVersion.description,
        intro_text: latestVersion.intro_text,
        consent_blurb: latestVersion.consent_blurb,
        thank_you_text: latestVersion.thank_you_text,
        tags: latestVersion.tags,
        questions_json: latestVersion.questions_json,
        created_by: ctx.userId
      });

      await recordAudit(ctx, 'duplicate_survey', 'survey', createdSurvey.id, { source: input.surveyId });
      return json(200, { surveyId: createdSurvey.id });
    }

    if (action === 'getSurveyVersion') {
      roleGuard(ctx, ['admin', 'creator']);
      const input = z.object({ surveyId: z.string().uuid() }).parse(body);
      await ensureSurveyAccess(ctx, input.surveyId);

      const { data: version, error } = await supabase
        .from('survey_versions')
        .select('*')
        .eq('survey_id', input.surveyId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error || !version) throw new Error('Survey version not found');

      return json(200, {
        version: {
          id: version.id,
          surveyId: version.survey_id,
          version: version.version,
          isPublished: version.is_published,
          title: version.title,
          description: version.description,
          introText: version.intro_text,
          consentBlurb: version.consent_blurb,
          thankYouText: version.thank_you_text,
          tags: version.tags,
          questions: version.questions_json,
          createdAt: version.created_at
        }
      });
    }

    if (action === 'listInvites') {
      roleGuard(ctx, ['admin', 'creator']);
      const input = z.object({ surveyId: z.string().uuid() }).parse(body);
      await ensureSurveyAccess(ctx, input.surveyId);
      const { data, error } = await supabase.from('invites').select('*').eq('survey_id', input.surveyId).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);

      return json(200, {
        invites: (data ?? []).map((row) => ({
          id: row.id,
          surveyId: row.survey_id,
          token: row.token,
          email: row.email,
          expiresAt: row.expires_at,
          status: row.status,
          createdAt: row.created_at
        }))
      });
    }

    if (action === 'createInvite') {
      roleGuard(ctx, ['admin', 'creator']);
      const input = inviteSchema.parse(body);
      await ensureSurveyAccess(ctx, input.surveyId);

      const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
      const { data, error } = await supabase
        .from('invites')
        .insert({
          survey_id: input.surveyId,
          token,
          email: input.email,
          expires_at: input.expiresAt,
          status: 'sent'
        })
        .select('*')
        .single();

      if (error || !data) throw new Error('Failed to create invite');
      await recordAudit(ctx, 'create_invite', 'invite', data.id, { surveyId: input.surveyId });

      const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';

      return json(200, {
        invite: {
          id: data.id,
          surveyId: data.survey_id,
          token: data.token,
          email: data.email,
          expiresAt: data.expires_at,
          status: data.status,
          createdAt: data.created_at
        },
        link: `${siteUrl}/participant/${token}`
      });
    }

    if (action === 'reportSummary') {
      roleGuard(ctx, ['admin', 'creator']);
      const input = z.object({ surveyId: z.string().uuid() }).parse(body);
      await ensureSurveyAccess(ctx, input.surveyId);

      const { data: invites } = await supabase.from('invites').select('id,status,created_at').eq('survey_id', input.surveyId);
      const { data: responses } = await supabase
        .from('responses')
        .select('id,answers_json,started_at,completed_at,status')
        .eq('survey_id', input.surveyId)
        .order('created_at', { ascending: false });

      const totalInvites = invites?.length ?? 0;
      const started = invites?.filter((invite) => invite.status === 'started' || invite.status === 'completed').length ?? 0;
      const completed = invites?.filter((invite) => invite.status === 'completed').length ?? 0;
      const completionRate = totalInvites ? Math.round((completed / totalInvites) * 100) : 0;

      const durations = (responses ?? [])
        .map((response) => {
          if (!response.started_at || !response.completed_at) return null;
          return Math.max(0, Math.round((new Date(response.completed_at).getTime() - new Date(response.started_at).getTime()) / 1000));
        })
        .filter((value): value is number => value !== null)
        .sort((a, b) => a - b);

      const medianDurationSeconds = durations.length ? durations[Math.floor(durations.length / 2)] : 0;

      const rows = (responses ?? []).map((response) => ({
        response_id: response.id,
        status: response.status,
        answers: response.answers_json,
        started_at: response.started_at,
        completed_at: response.completed_at
      }));

      return json(200, {
        summary: {
          total_invites: totalInvites,
          started,
          completed,
          completion_rate_percent: completionRate,
          median_time_seconds: medianDurationSeconds
        },
        rows
      });
    }

    if (action === 'exportCsv') {
      roleGuard(ctx, ['admin', 'creator']);
      const input = z.object({ surveyId: z.string().uuid() }).parse(body);
      await ensureSurveyAccess(ctx, input.surveyId);

      const { data: responses } = await supabase
        .from('responses')
        .select('id,status,answers_json,started_at,completed_at,created_at')
        .eq('survey_id', input.surveyId)
        .order('created_at', { ascending: false });

      const headers = ['response_id', 'status', 'started_at', 'completed_at', 'answers'];
      const lines = [headers.join(',')];
      for (const response of responses ?? []) {
        lines.push(
          [response.id, response.status, response.started_at, response.completed_at, JSON.stringify(response.answers_json)]
            .map((value) => csvEscape(value))
            .join(',')
        );
      }

      await recordAudit(ctx, 'export_csv', 'survey', input.surveyId, { count: responses?.length ?? 0 });
      return json(200, { csv: lines.join('\n') });
    }

    return json(400, { message: `Unknown action: ${action}` });
  } catch (error) {
    return json(400, { message: error instanceof Error ? error.message : 'Unknown error' });
  }
};
