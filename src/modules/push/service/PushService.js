import webpush from 'web-push';
import Logger from '../../../utils/Logger.js';
import config from '../../../config/config.js';
import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import UserPreferencesService from '../../userPreferences/service/UserPreferencesService.js';

const VAPID_CONFIGURED = Boolean(config.webPush.publicKey && config.webPush.privateKey);
if (VAPID_CONFIGURED) {
    webpush.setVapidDetails(config.webPush.subject, config.webPush.publicKey, config.webPush.privateKey);
}

/**
 * Backs the "Browser push notifications" preference toggle - genuinely
 * sends a push message to every browser/device the user has subscribed
 * from, gated by their own UserPreferences.browser_push_notifications flag
 * (same "check the toggle before sending" pattern NotificationService's
 * email sends now also follow for deal/territory updates). No-ops entirely
 * if this environment hasn't generated a VAPID key pair yet (config.webPush
 * blank) - same "never block the real action" philosophy as email sends.
 */
class PushService {
    constructor(models) {
        this.models = models;
        this.userPreferencesService = new UserPreferencesService(models);
    }

    isConfigured() {
        return VAPID_CONFIGURED;
    }

    getPublicKey() {
        return config.webPush.publicKey;
    }

    async subscribe(orgId, userId, { endpoint, keys } = {}) {
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            throw new AppError('A valid push subscription (endpoint + keys) is required.', 400, ErrorCode.VALIDATION_ERROR);
        }
        const { PushSubscription } = this.models;
        const [row] = await PushSubscription.findOrCreate({
            where: { org_id: orgId, user_id: userId, endpoint },
            defaults: { org_id: orgId, user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        });
        if (row.p256dh !== keys.p256dh || row.auth !== keys.auth) {
            row.p256dh = keys.p256dh;
            row.auth = keys.auth;
            await row.save();
        }
        return row;
    }

    async unsubscribe(orgId, userId, endpoint) {
        const { PushSubscription } = this.models;
        await PushSubscription.destroy({ where: { org_id: orgId, user_id: userId, endpoint } });
    }

    /**
     * Best-effort, like every NotificationService `send*` method - a failed
     * or unconfigured push never blocks the deal/territory update that
     * triggered it. Prunes subscriptions the browser itself has revoked
     * (410 Gone / 404) so dead endpoints don't pile up and get retried forever.
     */
    async sendToUser(orgId, userId, { title, body, url }) {
        if (!VAPID_CONFIGURED) return;

        const preferences = await this.userPreferencesService.getForUser(orgId, userId);
        if (!preferences.browserPushNotifications) return;

        const { PushSubscription } = this.models;
        const subscriptions = await PushSubscription.findAll({ where: { org_id: orgId, user_id: userId } });
        if (subscriptions.length === 0) return;

        const payload = JSON.stringify({ title, body, url: url ?? '/' });

        await Promise.all(subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    payload
                );
            } catch (err) {
                if (err?.statusCode === 410 || err?.statusCode === 404) {
                    await sub.destroy();
                } else {
                    Logger.error('[PushService] Failed to send push notification:', err?.message ?? err);
                }
            }
        }));
    }
}

export default PushService;
