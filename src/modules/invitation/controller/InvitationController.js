import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class InvitationController {
    constructor(invitationService) {
        this.invitationService = invitationService;
    }

    /**
     * POST /api/org/:orgId/invites - always takes { invites: [...] }, even
     * for a single invite (bulk, max 100 - see design doc §4/§5 QA).
     */
    async createInvites(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const createdByUserId = req.user?.id ?? req.userId;
            const invites = req.body.invites;
            const created = await this.invitationService.createInvitationsBulk(orgId, invites, createdByUserId);
            return res.json(ResponseFormatter.success('Invites sent successfully', created, 201));
        } catch (err) {
            next(err);
        }
    }

    async listInvites(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const invites = await this.invitationService.listInvitations(orgId, req.query.status);
            return res.json(ResponseFormatter.success('Invites fetched successfully', invites, 200));
        } catch (err) {
            next(err);
        }
    }

    async revokeInvite(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const invitation = await this.invitationService.revokeInvitation(orgId, req.params.id);
            return res.json(ResponseFormatter.success('Invite revoked successfully', invitation, 200));
        } catch (err) {
            next(err);
        }
    }

    async resendInvite(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const invitation = await this.invitationService.resendInvitation(orgId, req.params.id);
            return res.json(ResponseFormatter.success('Invite resent successfully', invitation, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default InvitationController;
