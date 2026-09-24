import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { NOTIFICATION_TEMPLATE_TYPES } from '../constants.js';

/**
 * Admin-facing CRUD for "Support configurable notification templates" -
 * lets an org override the subject/heading/body text of any system email.
 * NotificationService is where an override is actually applied at send time
 * (see its `_buildEmail`); this service only manages the override rows.
 */
class NotificationTemplateService {
    constructor(models) {
        this.models = models;
    }

    /** Always one row per known type, whether or not it's been customized - defaults filled in for display. */
    async listForOrg(orgId) {
        const { NotificationTemplate } = this.models;
        const rows = await NotificationTemplate.findAll({ where: { org_id: orgId } });
        const byType = new Map(rows.map((r) => [r.type, r]));

        return NOTIFICATION_TEMPLATE_TYPES.map((def) => {
            const row = byType.get(def.type);
            return {
                type: def.type,
                label: def.label,
                description: def.description,
                variables: def.variables,
                defaultSubject: def.defaultSubject,
                defaultHeading: def.defaultHeading,
                subject: row?.subject ?? null,
                heading: row?.heading ?? null,
                bodyText: row?.body_text ?? null,
                isCustomized: Boolean(row?.subject || row?.heading || row?.body_text),
            };
        });
    }

    async upsert(orgId, type, { subject, heading, bodyText } = {}) {
        const def = NOTIFICATION_TEMPLATE_TYPES.find((t) => t.type === type);
        if (!def) {
            throw new AppError('Unknown notification template type.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const { NotificationTemplate } = this.models;
        const [row] = await NotificationTemplate.findOrCreate({
            where: { org_id: orgId, type },
            defaults: { org_id: orgId, type },
        });
        row.subject = subject?.trim() || null;
        row.heading = heading?.trim() || null;
        row.body_text = bodyText?.trim() || null;
        await row.save();
        return row;
    }

    /** Clears all overrides for a type, reverting to the hardcoded default. */
    async reset(orgId, type) {
        const { NotificationTemplate } = this.models;
        await NotificationTemplate.destroy({ where: { org_id: orgId, type } });
    }
}

export default NotificationTemplateService;
