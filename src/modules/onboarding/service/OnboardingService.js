import { Op } from 'sequelize';
import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { Logger } from '../../../utils/index.js';
import { stripTags } from '../../../utils/sanitizeText.js';
import PortalUserService from '../../portalUser/service/PortalUserService.js';
import InvitationService from '../../invitation/service/InvitationService.js';
import CompanyDetailsService from '../../companyDetails/service/CompanyDetailsService.js';
import BusinessPreferencesService from '../../businessPreferences/service/BusinessPreferencesService.js';
import IntegrationService from '../../integrations/service/IntegrationService.js';
import AuditLogService from '../../auditLog/service/AuditLogService.js';
import AnalyticsService from '../../analytics/service/AnalyticsService.js';
import NotificationService from '../../notifications/service/NotificationService.js';

/** Mirrors BusinessPreferences.DEFAULT_ENABLED_MODULES - the only module keys the Preferences step's toggle list actually offers. */
const VALID_MODULE_KEYS = ['leads', 'deals', 'tasks', 'meetings', 'tickets', 'inventory'];

/**
 * Steps the "Skip" endpoint accepts - permission-gated screens (or, for
 * 'team_invite', a permitted user who simply chooses to invite no one right
 * now) only; About You and the conditional CRM Basics primer are never
 * skippable.
 */
const SKIPPABLE_STEPS = ['about_company', 'team_invite', 'data_import', 'pipeline_preference', 'integrations'];

/**
 * Effective screen order for a given wizard state. Mostly fixed (see
 * salecrmfe ONBOARDING_STEPS), but with one deliberate conditional branch:
 * a user who answered "no" to "used a CRM before?" on About You also gets a
 * 'crm_basics' primer screen before About Company; a user who answered
 * "yes" skips straight from About You to About Company. This is the one
 * genuinely conditional screen in the wizard - every other screen is shown
 * to everyone per design doc §4.1.
 */
function getStepOrder(answers) {
    const order = ['welcome', 'about_you'];
    if (answers?.about_you?.usedCrmBefore === false) {
        order.push('crm_basics');
    }
    order.push('about_company', 'team_invite', 'data_import', 'pipeline_preference', 'integrations', 'review');
    return order;
}

/**
 * Drives the per-(org, user) onboarding wizard - design doc §4. Every
 * invited user goes through the identical screen sequence; what differs is
 * only which fields they can actually write, enforced here server-side
 * (§4.3's explicit requirement) regardless of what the UI shows/hides.
 *
 * Note: the design doc's §4.3 table says completing onboarding should, on
 * an org's first completion, "also call userbd's onboarding-complete to
 * flip the org flag." userbd's actual `/users/onboarding/complete` endpoint
 * turned out to be the shell's own org-creation wizard (requires
 * organizationName + products, creates the org) - a different flow, not a
 * generic "mark CRM onboarding done" flag. There's no matching userbd
 * endpoint to call for that purpose today, so that cross-service sync is
 * intentionally skipped here; completion is tracked entirely via this
 * org's own PortalUser.has_onboarded rows.
 */
class OnboardingService {
    constructor(models) {
        this.models = models;
        this.portalUserService = new PortalUserService(models);
        this.invitationService = new InvitationService(models);
        this.companyDetailsService = new CompanyDetailsService(models);
        this.businessPreferencesService = new BusinessPreferencesService(models);
        this.integrationService = new IntegrationService(models);
        this.auditLogService = new AuditLogService(models);
        this.analyticsService = new AnalyticsService(models);
        this.notificationService = new NotificationService(models);
    }

    async _requirePermission(orgId, userId, permission) {
        const portalUser = await this.portalUserService.getWithRole(userId, orgId);
        const permissions = portalUser.role?.permissions ?? {};
        // Same Super Admin bypass as PermissionMiddleware.js - without it, a
        // newly added permission key not yet re-seeded onto existing orgs'
        // Super Admin rows would 403 the org owner here even though every
        // other permission-gated route in the app still lets them through.
        const hasPermission = portalUser.role?.is_admin === true || permissions[permission] === true;
        if (!hasPermission) {
            throw new AppError(`You don't have permission to do this (${permission}).`, 403, ErrorCode.FORBIDDEN);
        }
        return portalUser;
    }

    async getState(orgId, userId) {
        const { OnboardingState } = this.models;
        const [state, created] = await OnboardingState.findOrCreate({
            where: { org_id: orgId, user_id: userId },
            defaults: { org_id: orgId, user_id: userId, current_step: 'welcome', answers: {}, status: 'in_progress' },
        });
        // `created` is only ever true once for a given (org, user) - the
        // exact-once semantics Analytics/Notifications item "track/notify
        // onboarding started" needs, regardless of which caller happens to
        // be the first to touch this state. Fire-and-forget (not awaited):
        // this must never add latency to every getState() call just
        // because the very first one also sends a welcome email.
        if (created) {
            this._onOnboardingStarted(orgId, userId).catch((err) => Logger.error('[OnboardingService] onboarding-started side effects failed:', err));
        }
        return state;
    }

    async _onOnboardingStarted(orgId, userId) {
        await this.analyticsService.track(orgId, userId, 'onboarding_started');
        await this.auditLogService.record(orgId, userId, 'onboarding.started', { entityType: 'onboarding_state' });
        const companyDetails = await this.companyDetailsService.getForOrg(orgId).catch(() => null);
        await this.notificationService.sendWelcomeEmail(orgId, userId, companyDetails?.companyName || 'your organization');
    }

    /**
     * What GET /api/onboarding/state actually serves - getState() plus the
     * resolved inviter name for the Welcome screen's "invited by {inviter}"
     * copy (item #2/#3 of the Welcome & Introduction checklist). Kept
     * separate from getState() because that one must keep returning a real
     * Sequelize instance - _saveStep and every save*Step method call
     * `.save()` on it, which a plain merged object wouldn't support.
     */
    async getStateForClient(orgId, userId) {
        const state = await this.getState(orgId, userId);
        const invitedByName = await this.portalUserService.getInviterName(orgId, userId);

        // Onboarding Progress checklist: a real completion percentage and a
        // per-step done/skipped/upcoming breakdown, computed from the same
        // ordered chain _assertStepUnlocked already enforces - not a guess,
        // and not the old WizardSidebar's hardcoded-index approximation.
        const order = getStepOrder(state.answers);
        const stepStatuses = {};
        let completedCount = 0;
        for (const step of order) {
            const ans = state.answers?.[step];
            if (!ans) {
                stepStatuses[step] = 'upcoming';
            } else if (ans.__skipped) {
                stepStatuses[step] = 'skipped';
                completedCount += 1;
            } else {
                stepStatuses[step] = 'done';
                completedCount += 1;
            }
        }
        const completionPercentage = state.status === 'completed' ? 100 : Math.round((completedCount / order.length) * 100);

        return { ...state.toJSON(), invitedByName, completionPercentage, stepStatuses };
    }

    /**
     * Best-effort: records that a step's action genuinely failed (an
     * unexpected/server-side error - see OnboardingController._trackFailure,
     * which only calls this for 5xx-class errors, never a normal 4xx
     * validation/permission/conflict rejection). Never throws itself, so a
     * failure to record a failure can't mask the real error being reported
     * back to the client.
     */
    async recordFailure(orgId, userId, step, message) {
        try {
            const state = await this.getState(orgId, userId);
            state.last_error = { step, message: String(message ?? 'Unknown error').slice(0, 500), occurredAt: new Date().toISOString() };
            await state.save();
        } catch (err) {
            Logger.error('[OnboardingService] Failed to record step failure:', err);
        }
    }

    async _saveStep(orgId, userId, step, patch, { advanceStep = true } = {}) {
        const state = await this.getState(orgId, userId);
        const previousAnswer = state.answers[step] || null;
        const isEdit = Boolean(previousAnswer) && !patch?.__skipped;
        state.answers = { ...state.answers, [step]: { ...(previousAnswer || {}), ...patch } };
        if (advanceStep) {
            state.current_step = step;
        }
        // A successful save/skip means whatever previously failed no longer
        // applies - stale failures shouldn't keep showing after the user
        // has clearly moved past them.
        state.last_error = null;
        // Real activity just happened - this row is no longer stale, so a
        // future abandonment sweep should be able to track it again if the
        // user goes quiet a second time (see runAbandonmentSweep).
        state.abandoned_tracked_at = null;
        await state.save();

        // Single chokepoint for every step write (real save or skip) - one
        // wire-up here covers "track step completed/skipped" (Analytics)
        // and "record step completion" (Audit & History) for all 10 steps
        // uniformly, rather than repeating this in every save*Step method.
        // Analytics keeps 'step_completed'/'step_skipped' regardless of
        // isEdit (that distinction is an audit-granularity concern, not an
        // analytics-funnel one).
        const eventType = patch?.__skipped ? 'step_skipped' : 'step_completed';
        await this.analyticsService.track(orgId, userId, eventType, { step });

        // Audit & History checklist #3 "record changes to captured
        // information" - a re-save of an already-answered step gets its own
        // `onboarding.step_edited` action with the changed field names,
        // instead of being indistinguishable from the first-time save.
        const auditAction = patch?.__skipped
            ? 'onboarding.step_skipped'
            : isEdit
                ? 'onboarding.step_edited'
                : 'onboarding.step_completed';
        const auditDetails = { step };
        if (isEdit) auditDetails.changedFields = Object.keys(patch).filter((k) => k !== '__skipped');
        await this.auditLogService.record(orgId, userId, auditAction, {
            entityType: 'onboarding_state', entityId: state.id, details: auditDetails,
        });

        return state;
    }

    /**
     * Rejects writing to a step if the step immediately before it in
     * getStepOrder()'s result hasn't been reached yet (saved for real, or
     * explicitly skipped via skipStep/acknowledged via crm_basics). Re-saving
     * a step that's already been reached (going Back and editing again) is
     * always allowed - this only guards against jumping ahead, e.g. a
     * crafted call to /preferences before /company was ever touched.
     */
    async _assertStepUnlocked(orgId, userId, step) {
        const state = await this.getState(orgId, userId);
        const order = getStepOrder(state.answers);
        const idx = order.indexOf(step);
        if (idx <= 0) return state; // first step in the chain (or not part of it) - nothing to unlock

        const priorStep = order[idx - 1];
        const priorReached = Boolean(state.answers?.[priorStep]);
        if (!priorReached) {
            throw new AppError(
                `Please complete the "${priorStep}" step before "${step}".`,
                409,
                ErrorCode.CONFLICT
            );
        }
        return state;
    }

    /**
     * Welcome screen (design doc §4.2 Screen 1) - previously untracked
     * server-side (see getStepOrder's history). Now the real first link in
     * the chain: required terms/conditions acceptance, gating every later
     * step the same way any other step-order violation does.
     */
    async saveWelcomeStep(orgId, userId, { termsAccepted }) {
        if (termsAccepted !== true) {
            throw new AppError('You must accept the Terms of Service and Privacy Policy to continue.', 400, ErrorCode.VALIDATION_ERROR);
        }
        return this._saveStep(orgId, userId, 'welcome', { termsAccepted: true, acceptedAt: new Date().toISOString() });
    }

    async saveProfileStep(orgId, userId, profileData) {
        // Always editable - the invitee's own profile (design doc §4.2 Screen 2).
        // Previously had zero server-side validation - a direct API call
        // could persist a blank name or garbage contact number.
        const name = stripTags(profileData?.name);
        if (!name) {
            throw new AppError('Name is required.', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (profileData?.contactNumber && !/^[+]?[()\-\s\d]{7,20}$/.test(profileData.contactNumber)) {
            throw new AppError('Please enter a valid contact number.', 400, ErrorCode.VALIDATION_ERROR);
        }
        await this._assertStepUnlocked(orgId, userId, 'about_you');
        return this._saveStep(orgId, userId, 'about_you', {
            ...profileData,
            name,
            jobTitle: stripTags(profileData?.jobTitle),
            // ISO alpha-2 from the shared country-selector list - just this
            // user's own profile answer, not linked to the org's
            // Country/Territory hierarchy in any way.
            country: stripTags(profileData?.country),
        });
    }

    async saveCompanyStep(orgId, userId, companyData) {
        // Server re-checks manage_organization_settings even if the UI
        // showed the field as editable - design doc §4.3 explicit requirement.
        await this._requirePermission(orgId, userId, 'manage_organization_settings');
        await this._assertStepUnlocked(orgId, userId, 'about_company');
        // companyName/industry (and, as of this pass, businessType/phone/
        // email/website/address/city/state/country/postalCode) are also the
        // canonical Settings > Company Details record, not just this
        // wizard's own JSON copy - otherwise these fields become
        // permanently uneditable once onboarding completes (ProtectedRoute
        // routes a completed user away from /onboarding for good), and
        // "company name" would drift across two unsynced copies.
        // companySize/teamSize stay onboarding-only (seat planning, not
        // really "business info" alongside legal/billing fields).
        const companyName = stripTags(companyData.companyName);
        const companyDetailsPatch = { companyName, industry: companyData.industry };
        for (const field of ['businessType', 'phone', 'email', 'website', 'address', 'city', 'state', 'country', 'postalCode']) {
            if (companyData[field] !== undefined) companyDetailsPatch[field] = stripTags(companyData[field]);
        }
        await this.companyDetailsService.update(orgId, companyDetailsPatch, {
            isDraft: Boolean(companyData.isDraft),
            actorUserId: userId,
        });
        return this._saveStep(orgId, userId, 'about_company', { ...companyData, companyName });
    }

    async saveInvitesStep(orgId, userId, invites) {
        await this._requirePermission(orgId, userId, 'invite_users');
        await this._assertStepUnlocked(orgId, userId, 'team_invite');
        const { created, failed } = await this.invitationService.createInvitationsBulk(orgId, invites, userId);
        await this._saveStep(orgId, userId, 'team_invite', { invitedCount: created.length, failedCount: failed.length });
        return { created, failed };
    }

    async saveImportStep(orgId, userId, { fileName, fileUrl }) {
        // Stub: only stages the uploaded file reference - the Lead module
        // processes it later (design doc §4.2 Screens 4-6). Previously
        // accepted anything at all, including non-string garbage.
        if (fileName !== undefined && fileName !== null && typeof fileName !== 'string') {
            throw new AppError('fileName must be a string.', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (fileUrl !== undefined && fileUrl !== null && typeof fileUrl !== 'string') {
            throw new AppError('fileUrl must be a string.', 400, ErrorCode.VALIDATION_ERROR);
        }
        await this._requirePermission(orgId, userId, 'import_leads');
        await this._assertStepUnlocked(orgId, userId, 'data_import');
        return this._saveStep(orgId, userId, 'data_import', { fileName: fileName ?? null, fileUrl: fileUrl ?? null });
    }

    async savePreferencesStep(orgId, userId, preferences) {
        // Previously accepted any value at all for enabledModules, including
        // a made-up module key that no toggle on the actual screen offers.
        const enabledModules = preferences?.enabledModules;
        if (enabledModules !== undefined) {
            if (!Array.isArray(enabledModules) || enabledModules.some((m) => !VALID_MODULE_KEYS.includes(m))) {
                throw new AppError(`enabledModules must only contain: ${VALID_MODULE_KEYS.join(', ')}.`, 400, ErrorCode.VALIDATION_ERROR);
            }
        }
        await this._requirePermission(orgId, userId, 'manage_organization_settings');
        await this._assertStepUnlocked(orgId, userId, 'pipeline_preference');
        // Also sync into the canonical, org-wide BusinessPreferences record -
        // the raw OnboardingState.answers JSON below is keyed per (org, user)
        // and becomes unreachable once THIS invitee's onboarding completes,
        // with nothing else in the app ever reading it back (see Settings >
        // Business Preferences, which is the actual downstream consumer now).
        // BusinessPreferencesService.update already whitelists to its own
        // known fields, so passing the whole payload through is safe even
        // though `preferences` may also carry onboarding-only bookkeeping
        // (e.g. __skipped).
        const businessPreferencesPatch = {};
        for (const field of ['enabledModules', 'productCategories', 'defaultTerritoryId', 'defaultCurrency']) {
            if (preferences?.[field] !== undefined) businessPreferencesPatch[field] = preferences[field];
        }
        if (Object.keys(businessPreferencesPatch).length > 0) {
            await this.businessPreferencesService.update(orgId, businessPreferencesPatch, userId);
        }
        return this._saveStep(orgId, userId, 'pipeline_preference', preferences);
    }

    /**
     * Records a step as passed without real answer data - what "Skip" calls
     * for a step the caller can't act on (missing permission) or chooses
     * not to fill in. Without this, a skipped step would never appear in
     * `answers`, and _assertStepUnlocked would permanently block every step
     * after it for that user.
     */
    async skipStep(orgId, userId, step) {
        if (!SKIPPABLE_STEPS.includes(step)) {
            throw new AppError(`"${step}" is not a skippable onboarding step.`, 400, ErrorCode.VALIDATION_ERROR);
        }
        await this._assertStepUnlocked(orgId, userId, step);
        return this._saveStep(orgId, userId, step, { __skipped: true });
    }

    /**
     * Acknowledges the conditional 'crm_basics' primer (design doc has no
     * §4.2 screen number for this - it's new, added to genuinely satisfy
     * "conditional screens based on previous responses" rather than fixed
     * per-role field gating). Always allowed for the step's own occupant,
     * once About You has actually been reached.
     */
    async acknowledgeCrmBasicsStep(orgId, userId) {
        await this._assertStepUnlocked(orgId, userId, 'crm_basics');
        return this._saveStep(orgId, userId, 'crm_basics', { acknowledged: true });
    }

    /**
     * Integrations screen - like Team Invite, the real work (connect/
     * disconnect) happens through the generic `/api/org/:orgId/integrations/*`
     * endpoints (reused, not duplicated here), so this only marks the step
     * as reached. Deliberately never checks whether anything is actually
     * connected: "prevent onboarding from failing because of an optional
     * integration" - no provider in the registry is required, so Continue
     * always succeeds regardless of connection status.
     */
    async acknowledgeIntegrationsStep(orgId, userId) {
        await this._assertStepUnlocked(orgId, userId, 'integrations');
        return this._saveStep(orgId, userId, 'integrations', { acknowledged: true });
    }

    /**
     * Everything the Review & Confirmation screen shows, assembled from
     * across every table this wizard writes into - nothing previously
     * aggregated all of `answers` + `Invitation` + `IntegrationConnection`
     * + `BusinessPreferences` into one payload. `missingSteps` reuses the
     * exact same ordered chain `_assertStepUnlocked` enforces, so it can
     * never disagree with what the wizard itself would actually allow.
     */
    async getReviewSummary(orgId, userId) {
        const state = await this.getState(orgId, userId);
        const order = getStepOrder(state.answers);
        const missingSteps = order.filter((step) => step !== 'review' && !state.answers?.[step]);

        const [invitations, integrations, businessPreferences] = await Promise.all([
            this.invitationService.listInvitations(orgId).then((rows) => rows.filter((r) => String(r.created_by) === String(userId))),
            this.integrationService.listProviders(orgId),
            this.businessPreferencesService.getForOrg(orgId),
        ]);

        return {
            answers: state.answers,
            missingSteps,
            invitations,
            integrations,
            businessPreferences,
        };
    }

    /**
     * "Confirm & Complete" on the Review screen - the explicit confirmation
     * gate item #9 of the Review & Confirmation checklist asks for. Refuses
     * to confirm while any mandatory step is still missing, same check
     * `complete()` now also makes independently (defense in depth - this
     * one gives the friendlier, earlier error; that one is the real backstop).
     */
    /** Frontend-reported "this screen was shown" event (Analytics checklist #2) - unlike every other tracked event, the backend genuinely can't know this on its own, since rendering a screen involves no save/skip call. */
    async trackScreenViewed(orgId, userId, step) {
        await this.analyticsService.track(orgId, userId, 'screen_viewed', { step });
    }

    /**
     * Analytics checklist #6 "track onboarding resumed" - like
     * trackScreenViewed, the frontend has to report this itself: it fires
     * once per wizard mount, only when the mount lands on a step other than
     * 'welcome' (i.e. genuinely returning to progress already made, not a
     * fresh start) - see OnboardingWizard.tsx's mount effect.
     */
    async trackResumed(orgId, userId, step) {
        await this.analyticsService.track(orgId, userId, 'onboarding_resumed', { step });
    }

    /** Analytics checklist #7 "track validation errors" - called from OnboardingController._trackValidationError for 400-class rejections specifically. */
    async trackValidationError(orgId, userId, step, message) {
        await this.analyticsService.track(orgId, userId, 'validation_error', { step, details: { message } });
    }

    /**
     * Analytics checklist #5 "track onboarding abandonment" - periodic job
     * (registered in src/index.js): any still-`in_progress` row that hasn't
     * been touched in `thresholdDays` gets one `onboarding_abandoned` event,
     * tagged with the step it stalled on (feeds "drop-off by step"), and is
     * flagged via `abandoned_tracked_at` so it isn't re-tracked every run.
     * `_saveStep` clears that flag on the next real save, so a user who
     * resumes and later goes quiet again gets tracked a second time.
     */
    async runAbandonmentSweep({ thresholdDays = 7 } = {}) {
        const { OnboardingState } = this.models;
        const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
        const stale = await OnboardingState.findAll({
            where: {
                status: 'in_progress',
                abandoned_tracked_at: null,
                updated_at: { [Op.lt]: cutoff },
            },
        });

        let tracked = 0;
        for (const state of stale) {
            try {
                await this.analyticsService.track(state.org_id, state.user_id, 'onboarding_abandoned', { step: state.current_step });
                state.abandoned_tracked_at = new Date();
                await state.save();
                tracked += 1;
            } catch (err) {
                Logger.error(`[OnboardingService] Failed to track abandonment for state ${state.id}:`, err);
            }
        }
        return { checked: stale.length, tracked };
    }

    async acknowledgeReviewStep(orgId, userId) {
        const state = await this._assertStepUnlocked(orgId, userId, 'review');
        const order = getStepOrder(state.answers);
        const missingSteps = order.filter((step) => step !== 'review' && !state.answers?.[step]);
        if (missingSteps.length > 0) {
            throw new AppError(`Please complete these steps first: ${missingSteps.join(', ')}.`, 409, ErrorCode.CONFLICT);
        }
        return this._saveStep(orgId, userId, 'review', { confirmed: true });
    }

    // ==================== ADMIN & SUPPORT CONTROLS ====================

    /**
     * Everything an admin's "View Details" needs for one specific
     * teammate's onboarding - same stepStatuses/percentage computation
     * getStateForClient uses for the caller's own state, but for an
     * arbitrary target user (Admin & Support Controls checklist #1-6, #11).
     */
    async getAdminOnboardingDetail(orgId, targetUserId) {
        const state = await this.getState(orgId, targetUserId);
        const order = getStepOrder(state.answers);
        const stepStatuses = {};
        let completedCount = 0;
        for (const step of order) {
            const ans = state.answers?.[step];
            if (!ans) {
                stepStatuses[step] = 'upcoming';
            } else if (ans.__skipped) {
                stepStatuses[step] = 'skipped';
                completedCount += 1;
            } else {
                stepStatuses[step] = 'done';
                completedCount += 1;
            }
        }
        const completionPercentage = state.status === 'completed' ? 100 : Math.round((completedCount / order.length) * 100);
        const missingSteps = order.filter((step) => !state.answers?.[step]);

        const [invitations, integrations, auditHistory] = await Promise.all([
            this.invitationService.listInvitations(orgId).then((rows) => rows.filter((r) => String(r.created_by) === String(targetUserId))),
            this.integrationService.listProviders(orgId),
            this.auditLogService.listForOrg(orgId, { limit: 50 }).then((rows) => rows.filter((r) => String(r.actor_user_id) === String(targetUserId))),
        ]);

        return {
            currentStep: state.current_step,
            status: state.status,
            completionPercentage,
            stepStatuses,
            missingSteps,
            answers: state.answers,
            invitations,
            integrations,
            auditHistory,
        };
    }

    /**
     * Admin & Support Controls #8 "reset specific onboarding steps" -
     * clears one step AND every step after it in the ordered chain (their
     * own unlock check would otherwise be left inconsistent - a later step
     * could still read as "reached" while the step it actually depended on
     * is now blank again).
     */
    async resetOnboardingStepAsAdmin(orgId, targetUserId, step, actorUserId) {
        const state = await this.getState(orgId, targetUserId);
        const order = getStepOrder(state.answers);
        const idx = order.indexOf(step);
        if (idx < 0) {
            throw new AppError(`"${step}" is not a resettable onboarding step.`, 400, ErrorCode.VALIDATION_ERROR);
        }

        const clearedSteps = order.slice(idx);
        const nextAnswers = { ...state.answers };
        for (const s of clearedSteps) delete nextAnswers[s];
        state.answers = nextAnswers;
        state.current_step = idx > 0 ? order[idx - 1] : 'welcome';
        if (state.status === 'completed') state.status = 'in_progress';
        await state.save();

        await this.auditLogService.record(orgId, actorUserId, 'onboarding.step_reset', {
            entityType: 'onboarding_state', entityId: state.id, details: { targetUserId, step, clearedSteps },
        });
        return state;
    }

    /**
     * Admin & Support Controls #9 "manually complete onboarding where
     * authorised" - unlike complete(), this deliberately bypasses the
     * mandatory-step check (that's the entire point of an override), but
     * always leaves an explicit audit entry marking it as one, distinct
     * from a normal self-completion.
     */
    async forceCompleteOnboardingAsAdmin(orgId, targetUserId, actorUserId) {
        const { OnboardingState } = this.models;
        const sequelize = OnboardingState.sequelize;

        const state = await sequelize.transaction(async (transaction) => {
            const [row] = await OnboardingState.findOrCreate({
                where: { org_id: orgId, user_id: targetUserId },
                defaults: { org_id: orgId, user_id: targetUserId, current_step: 'processing', answers: {}, status: 'in_progress' },
                transaction,
            });
            row.status = 'completed';
            row.current_step = 'done';
            row.completed_at = new Date();
            await row.save({ transaction });
            await this.portalUserService.markOnboarded(orgId, targetUserId, transaction);
            return row;
        });

        await this.auditLogService.record(orgId, actorUserId, 'onboarding.force_completed', {
            entityType: 'onboarding_state', entityId: state.id, details: { targetUserId, override: true },
        });
        return state;
    }

    async complete(orgId, userId) {
        const { OnboardingState } = this.models;
        const sequelize = OnboardingState.sequelize;

        const { state, justCompleted } = await sequelize.transaction(async (transaction) => {
            const [row] = await OnboardingState.findOrCreate({
                where: { org_id: orgId, user_id: userId },
                defaults: { org_id: orgId, user_id: userId, current_step: 'processing', answers: {}, status: 'in_progress' },
                transaction,
            });

            // Idempotent: a duplicate /complete call (double-click, a
            // React effect double-invoking) is a no-op success rather than
            // re-running markOnboarded/audit-log/completedCount logic a
            // second time for what's actually one completion.
            if (row.status === 'completed') {
                return { state: row, justCompleted: false };
            }

            // The real fix for the security gap this checklist surfaced: a
            // crafted `POST /complete` right after login, before any real
            // step was ever saved, used to succeed unconditionally - this
            // reuses the exact same ordered chain every other write already
            // enforces, so completion can never skip the wizard.
            const order = getStepOrder(row.answers);
            const missingSteps = order.filter((step) => !row.answers?.[step]);
            if (missingSteps.length > 0) {
                throw new AppError(`Please complete these steps first: ${missingSteps.join(', ')}.`, 409, ErrorCode.CONFLICT);
            }

            row.status = 'completed';
            row.current_step = 'done';
            row.completed_at = new Date();
            await row.save({ transaction });

            await this.portalUserService.markOnboarded(orgId, userId, transaction);

            const completedCount = await this.portalUserService.countCompletedOnboardingsInOrg(orgId, transaction);
            if (completedCount === 1) {
                Logger.info(`[OnboardingService] Org ${orgId}'s first-ever onboarding completion (user ${userId}).`);
            }

            return { state: row, justCompleted: true };
        });

        // Best-effort, outside the transaction (an audit-log failure
        // shouldn't be able to roll back a real completion), and only for
        // an actual fresh completion - a duplicate/idempotent call must
        // never write a second "completed" entry for what's one event.
        // This also doubles as the "completion event" record (checklist
        // #15.9): there's no pub/sub event bus in this codebase, so this
        // is the durable, queryable record that it happened, who
        // triggered it, and when. Real email/notification delivery
        // (#15.10) is out of scope here - no notification-sending
        // infrastructure exists anywhere in this codebase yet to hook into.
        if (justCompleted) {
            const completionTimeMs = new Date(state.completed_at).getTime() - new Date(state.created_at).getTime();
            await this.auditLogService.record(orgId, userId, 'onboarding.completed', {
                entityType: 'onboarding_state', entityId: state.id, details: { completedAt: state.completed_at, completionTimeMs },
            });
            // Analytics checklist #11 "capture onboarding completion time" -
            // stored directly on this same event rather than a separate
            // record, since it's only ever meaningful alongside the
            // completion event itself.
            await this.analyticsService.track(orgId, userId, 'onboarding_completed', { details: { completionTimeMs } });

            // Fire-and-forget - a slow/misconfigured mailer must never
            // delay the response for the person who just finished setup.
            const companyDetails = await this.companyDetailsService.getForOrg(orgId).catch(() => null);
            this.notificationService
                .sendCompletionEmail(orgId, userId, companyDetails?.companyName || 'your organization')
                .catch((err) => Logger.error('[OnboardingService] completion email failed:', err));
        }

        return state;
    }
}

export default OnboardingService;
