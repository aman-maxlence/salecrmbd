import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class UserPreferencesController {
    constructor(userPreferencesService) {
        this.userPreferencesService = userPreferencesService;
    }

    _ctx(req) {
        return { orgId: req.user?.org?.id, userId: req.user?.id ?? req.userId };
    }

    async getPreferences(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            const preferences = await this.userPreferencesService.getForUser(orgId, userId);
            return res.json(ResponseFormatter.success('Preferences fetched successfully', preferences, 200));
        } catch (err) {
            next(err);
        }
    }

    async updatePreferences(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            const {
                dateFormat, currency,
                dealUpdateNotifications, territoryUpdateNotifications, browserPushNotifications,
            } = req.body;
            const preferences = await this.userPreferencesService.update(orgId, userId, {
                dateFormat, currency,
                dealUpdateNotifications, territoryUpdateNotifications, browserPushNotifications,
            });
            return res.json(ResponseFormatter.success('Preferences updated successfully', preferences, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default UserPreferencesController;
