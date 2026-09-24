import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class BusinessPreferencesController {
    constructor(businessPreferencesService) {
        this.businessPreferencesService = businessPreferencesService;
    }

    async getPreferences(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const preferences = await this.businessPreferencesService.getForOrg(orgId);
            return res.json(ResponseFormatter.success('Business preferences fetched successfully', preferences, 200));
        } catch (err) {
            next(err);
        }
    }

    async updatePreferences(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const actorUserId = req.user?.id ?? req.userId;
            const { enabledModules, productCategories, defaultTerritoryId, defaultCurrency, businessHours } = req.body;
            const preferences = await this.businessPreferencesService.update(orgId, {
                enabledModules, productCategories, defaultTerritoryId, defaultCurrency, businessHours,
            }, actorUserId);
            return res.json(ResponseFormatter.success('Business preferences updated successfully', preferences, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default BusinessPreferencesController;
