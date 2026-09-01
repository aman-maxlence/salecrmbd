import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { Logger } from '../../../utils/index.js';
import PortalUserService from '../../portalUser/service/PortalUserService.js';
import InvitationService from '../../invitation/service/InvitationService.js';

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
    }

    async _requirePermission(orgId, userId, permission) {
        const portalUser = await this.portalUserService.getWithRole(userId, orgId);
        const permissions = portalUser.role?.permissions ?? {};
        if (permissions[permission] !== true) {
            throw new AppError(`You don't have permission to do this (${permission}).`, 403, ErrorCode.FORBIDDEN);
        }
        return portalUser;
    }

    async getState(orgId, userId) {
        const { OnboardingState } = this.models;
        const [state] = await OnboardingState.findOrCreate({
            where: { org_id: orgId, user_id: userId },
            defaults: { org_id: orgId, user_id: userId, current_step: 'welcome', answers: {}, status: 'in_progress' },
        });
        return state;
    }

    async _saveStep(orgId, userId, step, patch) {
        const state = await this.getState(orgId, userId);
        state.answers = { ...state.answers, [step]: { ...(state.answers[step] || {}), ...patch } };
        state.current_step = step;
        await state.save();
        return state;
    }

    async saveProfileStep(orgId, userId, profileData) {
        // Always editable - the invitee's own profile (design doc §4.2 Screen 2).
        return this._saveStep(orgId, userId, 'about_you', profileData);
    }

    async saveCompanyStep(orgId, userId, companyData) {
        // Server re-checks manage_organization_settings even if the UI
        // showed the field as editable - design doc §4.3 explicit requirement.
        await this._requirePermission(orgId, userId, 'manage_organization_settings');
        return this._saveStep(orgId, userId, 'about_company', companyData);
    }

    async saveInvitesStep(orgId, userId, invites) {
        await this._requirePermission(orgId, userId, 'invite_users');
        const created = await this.invitationService.createInvitationsBulk(orgId, invites, userId);
        await this._saveStep(orgId, userId, 'team_invite', { invitedCount: created.length });
        return created;
    }

    async saveImportStep(orgId, userId, { fileName, fileUrl }) {
        // Stub: only stages the uploaded file reference - the Lead module
        // processes it later (design doc §4.2 Screens 4-6).
        await this._requirePermission(orgId, userId, 'import_leads');
        return this._saveStep(orgId, userId, 'data_import', { fileName: fileName ?? null, fileUrl: fileUrl ?? null });
    }

    async savePreferencesStep(orgId, userId, preferences) {
        await this._requirePermission(orgId, userId, 'manage_organization_settings');
        return this._saveStep(orgId, userId, 'pipeline_preference', preferences);
    }

    async complete(orgId, userId) {
        const { OnboardingState } = this.models;
        const sequelize = OnboardingState.sequelize;

        return sequelize.transaction(async (transaction) => {
            const [state] = await OnboardingState.findOrCreate({
                where: { org_id: orgId, user_id: userId },
                defaults: { org_id: orgId, user_id: userId, current_step: 'processing', answers: {}, status: 'in_progress' },
                transaction,
            });

            state.status = 'completed';
            state.current_step = 'done';
            await state.save({ transaction });

            await this.portalUserService.markOnboarded(orgId, userId, transaction);

            const completedCount = await this.portalUserService.countCompletedOnboardingsInOrg(orgId, transaction);
            if (completedCount === 1) {
                Logger.info(`[OnboardingService] Org ${orgId}'s first-ever onboarding completion (user ${userId}).`);
            }

            return state;
        });
    }
}

export default OnboardingService;
