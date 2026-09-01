import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import InviteLinkService from '../modules/inviteLink/service/InviteLinkService.js';
import InviteLinkController from '../modules/inviteLink/controller/InviteLinkController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/org/:orgId/invite-link. Same permission gate as the
 * per-email invite routes (invitationRoutes.js) - managing the org's
 * standing join link is an "invite_users" action too.
 */
export async function initializeInviteLinkRoutes() {
    try {
        const models = Database.getModels();
        const inviteLinkService = new InviteLinkService(models);
        const inviteLinkController = new InviteLinkController(inviteLinkService);

        router.get('/', AuthMiddleware, PermissionMiddleware('invite_users'), (req, res, next) => inviteLinkController.getLink(req, res, next));
        router.put('/', AuthMiddleware, PermissionMiddleware('invite_users'), (req, res, next) => inviteLinkController.updateSettings(req, res, next));
        router.post('/regenerate', AuthMiddleware, PermissionMiddleware('invite_users'), (req, res, next) => inviteLinkController.regenerateLink(req, res, next));
        router.post('/revoke', AuthMiddleware, PermissionMiddleware('invite_users'), (req, res, next) => inviteLinkController.revokeLink(req, res, next));

        Logger.info('Invite link routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing invite link routes:', err);
        throw err;
    }
}

export default initializeInviteLinkRoutes;
