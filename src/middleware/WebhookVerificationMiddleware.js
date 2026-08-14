import crypto from 'crypto';
import { Logger } from '../utils/index.js';
import config from '../config/config.js';

/**
 * Verifies inbound webhooks from userbd (HMAC-SHA256 over the raw JSON body),
 * using the shared secret configured as USER_SERVICE_WEBHOOK_SECRET here and
 * SALE_CRM_WEBHOOK_SECRET on userbd's side - same value, different env var
 * name per service, mirroring maxpmbd's WebhookVerificationMiddleware exactly.
 */
export class WebhookVerificationMiddleware {
    static verifyWebhookSignature(req, res, next) {
        try {
            const signature = req.headers['x-webhook-signature'];

            if (!signature) {
                Logger.error('Missing X-Webhook-Signature header');
                return res.status(403).json({ error: 'Missing webhook signature' });
            }

            const secret = config.webhook.secret;
            if (!secret) {
                Logger.error('USER_SERVICE_WEBHOOK_SECRET not configured');
                return res.status(500).json({ error: 'Webhook secret not configured' });
            }

            const payloadStr = JSON.stringify(req.body);
            const expectedSignature = 'sha256=' + crypto
                .createHmac('sha256', secret)
                .update(payloadStr)
                .digest('hex');

            let isValid = false;
            try {
                const signatureBuffer = Buffer.from(signature);
                const expectedBuffer = Buffer.from(expectedSignature);
                isValid =
                    signatureBuffer.length === expectedBuffer.length &&
                    crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
            } catch (err) {
                Logger.error('Signature comparison failed:', err.message);
                isValid = false;
            }

            if (!isValid) {
                Logger.error('Invalid webhook signature');
                return res.status(403).json({ error: 'Invalid webhook signature' });
            }

            Logger.info('Webhook signature verified');
            next();
        } catch (error) {
            Logger.error('Webhook verification error:', error);
            return res.status(500).json({ error: 'Webhook verification failed' });
        }
    }
}

export default WebhookVerificationMiddleware;
