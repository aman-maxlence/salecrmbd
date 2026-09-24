import Logger from '../../../utils/Logger.js';
import AuditLogService from '../../auditLog/service/AuditLogService.js';
import CatalogLookupService from '../../inventory/service/CatalogLookupService.js';
import { PRODUCT_CATEGORY_LABELS } from '../../../constants/productCategories.js';

const FIELDS = ['enabledModules', 'productCategories', 'defaultTerritoryId', 'defaultCurrency', 'businessHours'];

const COLUMN_BY_FIELD = {
    enabledModules: 'enabled_modules',
    productCategories: 'product_categories',
    defaultTerritoryId: 'default_territory_id',
    defaultCurrency: 'default_currency',
    businessHours: 'business_hours',
};

const columnFor = (field) => COLUMN_BY_FIELD[field] || field;

class BusinessPreferencesService {
    constructor(models) {
        this.models = models;
        this.auditLogService = new AuditLogService(models);
        this.itemCategoryService = new CatalogLookupService(models, 'ItemCategory', 'category_id', true);
    }

    toApiShape(row) {
        return FIELDS.reduce((acc, field) => ({ ...acc, [field]: row[columnFor(field)] }), { orgId: row.org_id });
    }

    /** Idempotent - creates the row with model defaults on first read, same pattern as CompanyDetailsService/UserPreferencesService. */
    async getOrCreate(orgId) {
        const { BusinessPreferences } = this.models;
        const [row] = await BusinessPreferences.findOrCreate({
            where: { org_id: orgId },
            defaults: { org_id: orgId },
        });
        return row;
    }

    async getForOrg(orgId) {
        const row = await this.getOrCreate(orgId);
        return this.toApiShape(row);
    }

    async update(orgId, data, actorUserId = null) {
        const row = await this.getOrCreate(orgId);

        const updates = {};
        for (const field of FIELDS) {
            if (data[field] !== undefined) updates[columnFor(field)] = data[field];
        }

        await row.update(updates);

        // "Apply default configuration based on selected options" (Business
        // Preferences checklist #5) - picking a product category here isn't
        // just a saved label, it seeds a real, ready-to-use Inventory item
        // category with the same name, so the org's catalog structure
        // starts pre-populated instead of the selection sitting unused.
        if (Array.isArray(data.productCategories)) {
            await this._syncItemCategories(orgId, data.productCategories);
        }

        Logger.info(`[BusinessPreferencesService] Updated business preferences for org=${orgId}`);
        // Audit & History checklist #11 "historical records for important
        // configuration changes" - covers both direct Settings edits and
        // the onboarding Preferences step (syncEnabledModulesFromOnboarding
        // below also routes through here).
        await this.auditLogService.record(orgId, actorUserId, 'business_preferences.updated', {
            entityType: 'business_preferences', entityId: row.id, details: { fields: Object.keys(updates) },
        });
        return this.toApiShape(row);
    }

    /**
     * Called from OnboardingService.savePreferencesStep so the module
     * selection made during onboarding lands in this canonical, org-wide
     * record - not just the onboarding wizard's own per-(org,user) JSON
     * blob, which becomes unreachable once that invitee's onboarding
     * completes (same defect CompanyDetails had before being split out
     * similarly in an earlier task).
     */
    async syncEnabledModulesFromOnboarding(orgId, enabledModules, actorUserId = null) {
        if (!Array.isArray(enabledModules)) return;
        await this.update(orgId, { enabledModules }, actorUserId);
    }

    /** Best-effort, idempotent - a category that already exists (same name) is left alone, never duplicated or errored on. */
    async _syncItemCategories(orgId, productCategoryKeys) {
        const { ItemCategory } = this.models;
        for (const key of productCategoryKeys) {
            const name = PRODUCT_CATEGORY_LABELS[key];
            if (!name) continue;
            try {
                const existing = await ItemCategory.findOne({ where: { org_id: orgId, name } });
                if (!existing) await this.itemCategoryService.create(orgId, { name });
            } catch (err) {
                Logger.error(`[BusinessPreferencesService] Failed to sync item category "${name}" for org=${orgId}:`, err.message);
            }
        }
    }
}

export default BusinessPreferencesService;
