import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class PortalUserController {
    constructor(portalUserService, onboardingService) {
        this.portalUserService = portalUserService;
        this.onboardingService = onboardingService;
    }

    async getMyProfile(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const userId = req.user?.id ?? req.userId;
            const profile = await this.portalUserService.getProfile(userId, orgId);
            return res.json(ResponseFormatter.success('Profile fetched successfully', profile, 200));
        } catch (err) {
            next(err);
        }
    }

    async listUsers(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const users = await this.portalUserService.listByOrg(orgId);
            return res.json(ResponseFormatter.success('Users fetched successfully', users, 200));
        } catch (err) {
            next(err);
        }
    }

    async updateUserRoleOrTerritory(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const actorUserId = req.user?.id ?? req.userId;
            const { roleId, territoryId, teamId, managerId } = req.body;
            const portalUser = await this.portalUserService.updateRoleOrTerritory(orgId, req.params.userId, { roleId, territoryId, teamId, managerId }, actorUserId);
            return res.json(ResponseFormatter.success('User updated successfully', portalUser, 200));
        } catch (err) {
            next(err);
        }
    }

    async removeUser(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const actingUserId = req.user?.id ?? req.userId;
            const portalUser = await this.portalUserService.removeUser(orgId, req.params.userId, actingUserId);
            return res.json(ResponseFormatter.success('User removed successfully', portalUser, 200));
        } catch (err) {
            next(err);
        }
    }

    async restartOnboarding(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const actorUserId = req.user?.id ?? req.userId;
            const portalUser = await this.portalUserService.restartOnboarding(orgId, req.params.userId, actorUserId);
            return res.json(ResponseFormatter.success('Onboarding restarted successfully', portalUser, 200));
        } catch (err) {
            next(err);
        }
    }

    /** Admin & Support Controls - view a specific teammate's onboarding status/step/%/invitations/integrations/history. */
    async getOnboardingDetail(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const detail = await this.onboardingService.getAdminOnboardingDetail(orgId, req.params.userId);
            return res.json(ResponseFormatter.success('Onboarding detail fetched successfully', detail, 200));
        } catch (err) {
            next(err);
        }
    }

    async resetOnboardingStep(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const actorUserId = req.user?.id ?? req.userId;
            const state = await this.onboardingService.resetOnboardingStepAsAdmin(orgId, req.params.userId, req.params.step, actorUserId);
            return res.json(ResponseFormatter.success('Step reset successfully', state, 200));
        } catch (err) {
            next(err);
        }
    }

    async forceCompleteOnboarding(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const actorUserId = req.user?.id ?? req.userId;
            const state = await this.onboardingService.forceCompleteOnboardingAsAdmin(orgId, req.params.userId, actorUserId);
            return res.json(ResponseFormatter.success('Onboarding marked complete', state, 200));
        } catch (err) {
            next(err);
        }
    }

    async switchContext(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const userId = req.user?.id ?? req.userId;
            const { activeContext, previewRoleId } = req.body;
            const portalUser = await this.portalUserService.switchContext(orgId, userId, { activeContext, previewRoleId });
            return res.json(ResponseFormatter.success('Context switched successfully', portalUser, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default PortalUserController;
