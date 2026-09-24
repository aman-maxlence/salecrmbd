import nodemailer from 'nodemailer';
import Logger from '../../../utils/Logger.js';
import config from '../../../config/config.js';

/**
 * Thin nodemailer wrapper, mirrors maxpmbd's own MailerService pattern
 * (same Gmail-SMTP-via-app-password approach, same config keys) so this
 * product's mail sending works the same way its sibling's already does.
 * Never throws past `send()` - a failed send is reported back as
 * `{success: false, error}` for the caller (NotificationService) to log,
 * not an exception that could take down whatever triggered the email.
 */
class MailerService {
    constructor() {
        this.isConfigured = Boolean(config.emailConfig.MAILER_USER && config.emailConfig.MAILER_PASS);
        if (!this.isConfigured) {
            Logger.warn('[MailerService] MAILER_USER/MAILER_PASS not set - emails will be logged as failed, not sent, until configured.');
            return;
        }

        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.emailConfig.MAILER_USER,
                pass: config.emailConfig.MAILER_PASS,
            },
        });

        this.transporter.verify((error) => {
            if (error) {
                Logger.error('[MailerService] SMTP connection error:', error.message);
            } else {
                Logger.info('[MailerService] SMTP connection established successfully');
            }
        });
    }

    async send(to, subject, html) {
        if (!this.isConfigured) {
            return { success: false, error: 'Mailer is not configured (MAILER_USER/MAILER_PASS missing).' };
        }
        try {
            const info = await this.transporter.sendMail({ from: config.emailConfig.MAILER_USER, to, subject, html });
            return { success: true, messageId: info.messageId };
        } catch (error) {
            Logger.error(`[MailerService] Failed to send email to ${to}:`, error.message);
            return { success: false, error: error.message };
        }
    }
}

// Singleton - one transporter for the process, same convention as maxpmbd's MailerService.
export default new MailerService();
