import Logger from '../../../utils/Logger.js';
import { Redis } from '../../redis/Redis.js';

/**
 * Write side of the generic audit trail. Deliberately best-effort/silent on
 * failure (same pattern as OnboardingService.recordFailure) - an audit-log
 * write failing must never block or fail the real action it's recording.
 */
class AuditLogService {
    constructor(models) {
        this.models = models;
    }

    async record(orgId, actorUserId, action, { entityType = null, entityId = null, details = null } = {}) {
        try {
            const { AuditLog } = this.models;
            await AuditLog.create({
                org_id: orgId,
                actor_user_id: actorUserId ?? null,
                action,
                entity_type: entityType,
                entity_id: entityId !== null && entityId !== undefined ? String(entityId) : null,
                details,
            });
        } catch (err) {
            Logger.error('[AuditLogService] Failed to record audit entry:', err);
        }
    }

    async listForOrg(orgId, { action, limit = 100 } = {}) {
        const { AuditLog } = this.models;
        return AuditLog.findAll({
            where: { org_id: orgId, ...(action && { action }) },
            order: [['created_at', 'DESC']],
            limit,
        });
    }

    /**
     * Audit & History checklist #11 "maintain historical records" - the
     * admin-facing org-wide view. Same rows as listForOrg, plus the actor's
     * name/email resolved from the shared Redis user cache (same
     * best-effort lookup PortalUserService._attachUserProfiles uses), since
     * a raw actor_user_id means nothing to an admin reading the page.
     */
    async listForOrgWithActors(orgId, { action, limit = 200 } = {}) {
        const rows = await this.listForOrg(orgId, { action, limit });
        const redisClient = Redis.getClient();
        const plain = rows.map((r) => r.toJSON());

        await Promise.all(
            plain.map(async (row) => {
                if (!row.actor_user_id) {
                    row.actorName = null;
                    row.actorEmail = null;
                    return;
                }
                try {
                    const raw = await redisClient.get(`users:${row.actor_user_id}`);
                    const profile = raw ? JSON.parse(raw) : null;
                    row.actorName = profile?.name ?? null;
                    row.actorEmail = profile?.email ?? null;
                } catch {
                    row.actorName = null;
                    row.actorEmail = null;
                }
            })
        );

        return plain;
    }
}

export default AuditLogService;
