import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class InviteLinkController {
    constructor(inviteLinkService) {
        this.inviteLinkService = inviteLinkService;
    }

    /**
     * GET /api/org/:orgId/invite-link - fetches (creating on first use) the
     * org's invite link + its role/territory settings.
     */
    async getLink(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const actingUserId = req.user?.id ?? req.userId;
            const inviteLink = await this.inviteLinkService.getOrCreateLink(orgId, actingUserId);
            return res.json(ResponseFormatter.success('Invite link fetched successfully', inviteLink, 200));
        } catch (err) {
            next(err);
        }
    }

    async updateSettings(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const actingUserId = req.user?.id ?? req.userId;
            const { roleId, territoryId } = req.body;
            const inviteLink = await this.inviteLinkService.updateLinkSettings(orgId, { roleId, territoryId }, actingUserId);
            return res.json(ResponseFormatter.success('Invite link settings updated successfully', inviteLink, 200));
        } catch (err) {
            next(err);
        }
    }

    async regenerateLink(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const actingUserId = req.user?.id ?? req.userId;
            const inviteLink = await this.inviteLinkService.regenerateLink(orgId, actingUserId);
            return res.json(ResponseFormatter.success('Invite link regenerated successfully', inviteLink, 200));
        } catch (err) {
            next(err);
        }
    }

    async revokeLink(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const actingUserId = req.user?.id ?? req.userId;
            const inviteLink = await this.inviteLinkService.revokeLink(orgId, actingUserId);
            return res.json(ResponseFormatter.success('Invite link revoked successfully', inviteLink, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default InviteLinkController;
