import Logger from '../../../utils/Logger.js';

const FIELDS = [
    'dateFormat', 'currency',
    'dealUpdateNotifications', 'territoryUpdateNotifications', 'browserPushNotifications',
];

const COLUMN_BY_FIELD = {
    dateFormat: 'date_format',
    dealUpdateNotifications: 'deal_update_notifications',
    territoryUpdateNotifications: 'territory_update_notifications',
    browserPushNotifications: 'browser_push_notifications',
};

const columnFor = (field) => COLUMN_BY_FIELD[field] || field;

class UserPreferencesService {
    constructor(models) {
        this.models = models;
    }

    toApiShape(row) {
        return FIELDS.reduce((acc, field) => ({ ...acc, [field]: row[columnFor(field)] }), {});
    }

    /** Idempotent - creates the row with model defaults on first read, same pattern as CompanyDetailsService. */
    async getOrCreate(orgId, userId) {
        const { UserPreferences } = this.models;
        const [row] = await UserPreferences.findOrCreate({
            where: { org_id: orgId, user_id: userId },
            defaults: { org_id: orgId, user_id: userId },
        });
        return row;
    }

    async getForUser(orgId, userId) {
        const row = await this.getOrCreate(orgId, userId);
        return this.toApiShape(row);
    }

    async update(orgId, userId, data) {
        const row = await this.getOrCreate(orgId, userId);

        const updates = {};
        for (const field of FIELDS) {
            if (data[field] !== undefined) updates[columnFor(field)] = data[field];
        }

        await row.update(updates);

        Logger.info(`[UserPreferencesService] Updated preferences for org=${orgId} user=${userId}`);
        return this.toApiShape(row);
    }
}

export default UserPreferencesService;
