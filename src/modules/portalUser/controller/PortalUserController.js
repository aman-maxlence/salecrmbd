import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class PortalUserController {
    constructor(portalUserService) {
        this.portalUserService = portalUserService;
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
            const { roleId, territoryId, teamId, managerId } = req.body;
            const portalUser = await this.portalUserService.updateRoleOrTerritory(orgId, req.params.userId, { roleId, territoryId, teamId, managerId });
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
