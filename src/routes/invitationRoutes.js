import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import InvitationService from '../modules/invitation/service/InvitationService.js';
import InvitationController from '../modules/invitation/controller/InvitationController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/org/:orgId/invites. GET (list) is gated the same as
 * writes here - maxpmbd's equivalent left its list/detail GETs unguarded,
 * which this deliberately does not repeat.
 */
export async function initializeInvitationRoutes() {
    try {
        const models = Database.getModels();
        const invitationService = new InvitationService(models);
        const invitationController = new InvitationController(invitationService);

        router.post('/', AuthMiddleware, PermissionMiddleware('invite_users'), (req, res, next) => invitationController.createInvites(req, res, next));
        router.get('/', AuthMiddleware, PermissionMiddleware('invite_users'), (req, res, next) => invitationController.listInvites(req, res, next));
        router.delete('/:id', AuthMiddleware, PermissionMiddleware('invite_users'), (req, res, next) => invitationController.revokeInvite(req, res, next));
        router.post('/:id/resend', AuthMiddleware, PermissionMiddleware('invite_users'), (req, res, next) => invitationController.resendInvite(req, res, next));

        Logger.info('Invitation routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing invitation routes:', err);
        throw err;
    }
}

export default initializeInvitationRoutes;
