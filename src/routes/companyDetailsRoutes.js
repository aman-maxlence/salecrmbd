import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import CompanyDetailsService from '../modules/companyDetails/service/CompanyDetailsService.js';
import CompanyDetailsController from '../modules/companyDetails/controller/CompanyDetailsController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/org/:orgId/company-details. GET has no permission gate
 * beyond auth - same reasoning as workspace-settings. Only the write needs
 * manage_company_details - a distinct permission from workspace-settings'
 * manage_organization_settings, since this is legal/billing data, not
 * branding/personalisation (see constants/permissions.js comment).
 */
export async function initializeCompanyDetailsRoutes() {
    try {
        const models = Database.getModels();
        const companyDetailsService = new CompanyDetailsService(models);
        const companyDetailsController = new CompanyDetailsController(companyDetailsService);

        router.get('/', AuthMiddleware, (req, res, next) => companyDetailsController.getDetails(req, res, next));
        router.put('/', AuthMiddleware, PermissionMiddleware('manage_company_details'), (req, res, next) => companyDetailsController.updateDetails(req, res, next));

        Logger.info('Company details routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing company details routes:', err);
        throw err;
    }
}

export default initializeCompanyDetailsRoutes;
