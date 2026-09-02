import express from 'express';
import { Logger } from '../utils/index.js';

const router = express.Router();

/**
 * Mounts every module's routes under /api. Add each new module here as it's
 * built out (Deals, Tasks, Meetings, Incentive, Tickets, Reports, Dashboard),
 * following the Sales Rep routes pattern below.
 */
export async function initializeAllRoutes() {
    try {
        const { default: initializeWebhookRoutes } = await import('./webhookRoutes.js');
        const webhookRoutes = await initializeWebhookRoutes();
        router.use('/webhooks', webhookRoutes);
        Logger.info('Webhook routes initialized');

        const { default: initializeSalesRepRoutes } = await import('./salesRepRoutes.js');
        const salesRepRoutes = await initializeSalesRepRoutes();
        router.use('/sales-reps', salesRepRoutes);
        Logger.info('Sales rep routes initialized');

        const { default: initializeOrgRoleRoutes } = await import('./orgRoleRoutes.js');
        const orgRoleRoutes = await initializeOrgRoleRoutes();
        router.use('/org/:orgId/roles', orgRoleRoutes);
        Logger.info('Org role routes initialized');

        const { default: initializeTerritoryRoutes } = await import('./territoryRoutes.js');
        const territoryRoutes = await initializeTerritoryRoutes();
        router.use('/org/:orgId/territories', territoryRoutes);
        Logger.info('Territory routes initialized');

        const { default: initializeDepartmentRoutes } = await import('./departmentRoutes.js');
        const departmentRoutes = await initializeDepartmentRoutes();
        router.use('/org/:orgId/departments', departmentRoutes);
        Logger.info('Department routes initialized');

        const { default: initializeTeamRoutes } = await import('./teamRoutes.js');
        const teamRoutes = await initializeTeamRoutes();
        router.use('/org/:orgId/teams', teamRoutes);
        Logger.info('Team routes initialized');

        const { default: initializeWorkspaceSettingsRoutes } = await import('./workspaceSettingsRoutes.js');
        const workspaceSettingsRoutes = await initializeWorkspaceSettingsRoutes();
        router.use('/org/:orgId/workspace-settings', workspaceSettingsRoutes);
        Logger.info('Workspace settings routes initialized');

        const { default: initializeCompanyDetailsRoutes } = await import('./companyDetailsRoutes.js');
        const companyDetailsRoutes = await initializeCompanyDetailsRoutes();
        router.use('/org/:orgId/company-details', companyDetailsRoutes);
        Logger.info('Company details routes initialized');

        const { default: initializePortalUserRoutes } = await import('./portalUserRoutes.js');
        const portalUserRoutes = await initializePortalUserRoutes();
        router.use('/org/:orgId/users', portalUserRoutes);
        Logger.info('Portal user routes initialized');

        const { default: initializeInvitationRoutes } = await import('./invitationRoutes.js');
        const invitationRoutes = await initializeInvitationRoutes();
        router.use('/org/:orgId/invites', invitationRoutes);
        Logger.info('Invitation routes initialized');

        const { default: initializeInviteLinkRoutes } = await import('./inviteLinkRoutes.js');
        const inviteLinkRoutes = await initializeInviteLinkRoutes();
        router.use('/org/:orgId/invite-link', inviteLinkRoutes);
        Logger.info('Invite link routes initialized');

        const { default: initializeOnboardingRoutes } = await import('./onboardingRoutes.js');
        const onboardingRoutes = await initializeOnboardingRoutes();
        router.use('/onboarding', onboardingRoutes);
        Logger.info('Onboarding routes initialized');

        const { default: initializeInventoryRoutes } = await import('./inventoryRoutes.js');
        const inventoryRoutes = await initializeInventoryRoutes();
        router.use('/org/:orgId/inventory', inventoryRoutes);
        Logger.info('Inventory routes initialized');

        const { default: initializeDealRoutes } = await import('./dealRoutes.js');
        const dealRoutes = await initializeDealRoutes();
        router.use('/org/:orgId/deals', dealRoutes);
        Logger.info('Deal routes initialized');

        return router;
    } catch (err) {
        Logger.error('Error initializing routes:', err);
        throw err;
    }
}

export default initializeAllRoutes;
