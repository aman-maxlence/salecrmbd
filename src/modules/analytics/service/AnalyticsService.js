import Logger from '../../../utils/Logger.js';

/**
 * Write side of raw onboarding event capture. Best-effort/silent on
 * failure, same convention as AuditLogService/OnboardingService.recordFailure -
 * tracking must never be able to break the real action it's observing.
 */
class AnalyticsService {
    constructor(models) {
        this.models = models;
    }

    async track(orgId, userId, eventType, { step = null, details = null } = {}) {
        try {
            const { AnalyticsEvent } = this.models;
            await AnalyticsEvent.create({ org_id: orgId, user_id: userId, event_type: eventType, step, details });
        } catch (err) {
            Logger.error('[AnalyticsService] Failed to record event:', err);
        }
    }

    /**
     * Read side of the Analytics & Tracking checklist's "capture" items -
     * completion rate, drop-off by step, average completion time - which
     * previously had no query anywhere despite every event being captured.
     * A single per-org summary rather than separate endpoints, since an
     * admin viewing one number always wants the others alongside it.
     */
    async getOnboardingSummary(orgId) {
        const { AnalyticsEvent } = this.models;

        const startedCount = await AnalyticsEvent.count({ where: { org_id: orgId, event_type: 'onboarding_started' } });

        const completedEvents = await AnalyticsEvent.findAll({
            where: { org_id: orgId, event_type: 'onboarding_completed' },
            attributes: ['details'],
        });
        const completedCount = completedEvents.length;
        const completionTimes = completedEvents
            .map((e) => e.details?.completionTimeMs)
            .filter((ms) => typeof ms === 'number' && ms > 0);
        const avgCompletionTimeMs = completionTimes.length
            ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
            : null;

        const abandonedRows = await AnalyticsEvent.findAll({
            where: { org_id: orgId, event_type: 'onboarding_abandoned' },
            attributes: ['step'],
        });
        const dropOffByStep = {};
        for (const row of abandonedRows) {
            const step = row.step || 'unknown';
            dropOffByStep[step] = (dropOffByStep[step] || 0) + 1;
        }

        const validationErrorCount = await AnalyticsEvent.count({ where: { org_id: orgId, event_type: 'validation_error' } });
        const integrationFailureCount = await AnalyticsEvent.count({ where: { org_id: orgId, event_type: 'integration_failed' } });

        return {
            startedCount,
            completedCount,
            abandonedCount: abandonedRows.length,
            completionRate: startedCount > 0 ? completedCount / startedCount : null,
            avgCompletionTimeMs,
            dropOffByStep,
            validationErrorCount,
            integrationFailureCount,
        };
    }
}

export default AnalyticsService;
