import Logger from '../../../utils/Logger.js';
import config from '../../../config/config.js';
import mailer from './MailerService.js';
import PortalUserService from '../../portalUser/service/PortalUserService.js';
import UserPreferencesService from '../../userPreferences/service/UserPreferencesService.js';
import PushService from '../../push/service/PushService.js';
import { NOTIFICATION_TEMPLATE_TYPES } from '../constants.js';
import { emailLayout } from '../templates/layout.js';
import {
    welcomeEmailTemplate, invitationAcceptedEmailTemplate, onboardingCompletionEmailTemplate,
    dealUpdateEmailTemplate, territoryUpdateEmailTemplate, invitationReminderEmailTemplate,
} from '../templates/index.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

/** `{{varName}}` placeholders in an org's custom template text - values are always escaped, unlike the hardcoded defaults below. */
const interpolate = (str, vars) => String(str ?? '').replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(vars[key]));

/**
 * Onboarding-triggered emails (Notifications checklist), plus (as of this
 * pass) the two "Set notification preferences" toggles that previously had
 * no real event behind them - deal updates and territory updates. Every
 * `send*` method is best-effort and never throws - a failed/misconfigured
 * mailer must never block the real action that triggered it (finishing
 * onboarding must succeed even if the "you're all set" email fails to
 * send). Every attempt, successful or not, is recorded to NotificationLog.
 * `sendDealUpdateEmail`/`sendTerritoryUpdateEmail` additionally check the
 * recipient's own UserPreferences toggle first and silently no-op if it's
 * off - unlike the onboarding emails above, which aren't gated by any
 * preference.
 */
class NotificationService {
    constructor(models) {
        this.models = models;
        this.portalUserService = new PortalUserService(models);
        this.userPreferencesService = new UserPreferencesService(models);
        this.pushService = new PushService(models);
    }

    /** Admin-facing "Email Activity" view - the log was already written on every send, nothing anywhere ever read it back before this. */
    async listForOrg(orgId, { limit = 100 } = {}) {
        const { NotificationLog } = this.models;
        return NotificationLog.findAll({
            where: { org_id: orgId },
            order: [['created_at', 'DESC']],
            limit,
        });
    }

    async _log(orgId, userId, type, recipientEmail, result) {
        try {
            const { NotificationLog } = this.models;
            await NotificationLog.create({
                org_id: orgId,
                user_id: userId,
                type,
                recipient_email: recipientEmail,
                status: result.success ? 'sent' : 'failed',
                error_message: result.success ? null : String(result.error ?? 'Unknown error').slice(0, 500),
            });
        } catch (err) {
            Logger.error('[NotificationService] Failed to write notification log:', err);
        }

        // "Handle failed email delivery" was previously just a silent log
        // row - an admin only ever found out by opening Settings > Email
        // Activity themselves. Push a real, immediate alert to every admin
        // instead, so a broken mailer (wrong credentials, Gmail's daily
        // limit, etc.) gets noticed the same day, not discovered by accident.
        if (!result.success) {
            await this._alertAdminsOfFailure(orgId, type, recipientEmail, result.error).catch(() => {});
        }
    }

    /** Best-effort - never throws, never blocks the send this was reporting on. */
    async _alertAdminsOfFailure(orgId, type, recipientEmail, error) {
        const { PortalUser, OrgRole } = this.models;
        const admins = await PortalUser.findAll({
            where: { org_id: orgId, status: 'active' },
            include: [{ model: OrgRole, as: 'role', where: { org_id: orgId }, required: true }],
        });

        const relevantAdmins = admins.filter((a) => a.role?.is_admin || a.role?.permissions?.manage_organization_settings === true);

        await Promise.all(relevantAdmins.map((admin) =>
            this.pushService.sendToUser(orgId, admin.user_id, {
                title: 'An email failed to send',
                body: `${type.replace(/_/g, ' ')} to ${recipientEmail}: ${error ?? 'Unknown error'}`,
                url: '/settings/notification-log',
            }).catch(() => {})
        ));
    }

    /**
     * "Support configurable notification templates" - checks for an org's
     * own override of `type` before falling back to `defaultTemplateFn`.
     * `vars` is exactly what `defaultTemplateFn` itself expects (so the
     * fallback path is untouched); `ctaLabel`/`ctaUrl`/`title` are only used
     * to rebuild the email shell when an override actually applies.
     */
    async _buildEmail(orgId, type, defaultTemplateFn, vars, { ctaLabel, ctaUrl, title } = {}) {
        const { NotificationTemplate } = this.models;
        const override = NotificationTemplate ? await NotificationTemplate.findOne({ where: { org_id: orgId, type } }) : null;
        if (!override || (!override.subject && !override.heading && !override.body_text)) {
            return defaultTemplateFn(vars);
        }

        const def = NOTIFICATION_TEMPLATE_TYPES.find((t) => t.type === type);
        const defaults = defaultTemplateFn(vars);
        const subject = override.subject ? interpolate(override.subject, vars) : defaults.subject;
        const heading = override.heading ? interpolate(override.heading, vars) : (def?.defaultHeading ?? title ?? subject);
        if (!override.body_text) return { subject, html: defaults.html };

        const bodyHtml = `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#4b5563;">${interpolate(override.body_text, vars).replace(/\n/g, '<br/>')}</p>`;
        return {
            subject,
            html: emailLayout({ title: title ?? def?.label ?? 'Notification', heading, bodyHtml, ctaLabel, ctaUrl }),
        };
    }

    async sendWelcomeEmail(orgId, userId, orgName) {
        const { email, name } = await this.portalUserService.getUserProfile(userId);
        if (!email) return;
        const dashboardUrl = `${config.emailConfig.SALE_CRM_FRONTEND_URL}/onboarding`;
        const { subject, html } = await this._buildEmail(
            orgId, 'onboarding_welcome', welcomeEmailTemplate,
            { userName: name || 'there', orgName, dashboardUrl },
            { ctaLabel: 'Start Setup', ctaUrl: dashboardUrl, title: 'Welcome to Sale CRM' }
        );
        const result = await mailer.send(email, subject, html);
        await this._log(orgId, userId, 'onboarding_welcome', email, result);
    }

    async sendInvitationAcceptedEmail(orgId, inviterUserId, { inviteeName, inviteeEmail, orgName }) {
        const { email: inviterEmail, name: inviterName } = await this.portalUserService.getUserProfile(inviterUserId);
        if (!inviterEmail) return;
        const teamUrl = `${config.emailConfig.SALE_CRM_FRONTEND_URL}/settings/team`;
        const { subject, html } = await this._buildEmail(
            orgId, 'invitation_accepted', invitationAcceptedEmailTemplate,
            { inviterName: inviterName || 'there', inviteeName, inviteeEmail, orgName, teamUrl },
            { ctaLabel: 'View Team', ctaUrl: teamUrl, title: 'Invitation accepted' }
        );
        const result = await mailer.send(inviterEmail, subject, html);
        await this._log(orgId, inviterUserId, 'invitation_accepted', inviterEmail, result);
    }

    /**
     * "Send invitation reminders where applicable" - nudges a still-pending
     * invitee, driven by InvitationService's reminder job/manual action. The
     * invitee isn't a portal user yet, so there's no preference to gate this
     * on and no local userId to attach the log row to.
     */
    async sendInvitationReminderEmail(orgId, { inviteeEmail, inviteeName, inviterName, orgName, acceptUrl }) {
        const { subject, html } = await this._buildEmail(
            orgId, 'invitation_reminder', invitationReminderEmailTemplate,
            { inviteeName: inviteeName || 'there', inviterName, orgName, acceptUrl },
            { ctaLabel: 'Open Sale CRM', ctaUrl: acceptUrl, title: 'Invitation reminder' }
        );
        const result = await mailer.send(inviteeEmail, subject, html);
        await this._log(orgId, null, 'invitation_reminder', inviteeEmail, result);
        return result;
    }

    async sendCompletionEmail(orgId, userId, orgName) {
        const { email, name } = await this.portalUserService.getUserProfile(userId);
        if (!email) return;
        const dashboardUrl = `${config.emailConfig.SALE_CRM_FRONTEND_URL}/`;
        const { subject, html } = await this._buildEmail(
            orgId, 'onboarding_completion', onboardingCompletionEmailTemplate,
            { userName: name || 'there', orgName, dashboardUrl },
            { ctaLabel: 'Go to Dashboard', ctaUrl: dashboardUrl, title: 'Onboarding complete' }
        );
        const result = await mailer.send(email, subject, html);
        await this._log(orgId, userId, 'onboarding_completion', email, result);
    }

    /** Gated by the recipient's own `dealUpdateNotifications` preference - silently does nothing (no log row either) if it's off. */
    async sendDealUpdateEmail(orgId, userId, { dealId, dealTitle, summary }) {
        const preferences = await this.userPreferencesService.getForUser(orgId, userId);
        const dealUrl = `${config.emailConfig.SALE_CRM_FRONTEND_URL}/deals/${dealId}`;

        await this.pushService.sendToUser(orgId, userId, {
            title: `Deal updated: ${dealTitle}`,
            body: summary,
            url: `/deals/${dealId}`,
        });

        if (!preferences.dealUpdateNotifications) return;
        const { email, name } = await this.portalUserService.getUserProfile(userId);
        if (!email) return;
        const { subject, html } = await this._buildEmail(
            orgId, 'deal_update', dealUpdateEmailTemplate,
            { userName: name || 'there', dealTitle, summary, dealUrl },
            { ctaLabel: 'View Deal', ctaUrl: dealUrl, title: 'Deal updated' }
        );
        const result = await mailer.send(email, subject, html);
        await this._log(orgId, userId, 'deal_update', email, result);
    }

    /** Gated by the recipient's own `territoryUpdateNotifications` preference - silently does nothing (no log row either) if it's off. */
    async sendTerritoryUpdateEmail(orgId, userId, { territoryId, territoryName, summary }) {
        const preferences = await this.userPreferencesService.getForUser(orgId, userId);
        const territoryUrl = `${config.emailConfig.SALE_CRM_FRONTEND_URL}/settings/hierarchy`;

        await this.pushService.sendToUser(orgId, userId, {
            title: `Territory updated: ${territoryName}`,
            body: summary,
            url: '/settings/hierarchy',
        });

        if (!preferences.territoryUpdateNotifications) return;
        const { email, name } = await this.portalUserService.getUserProfile(userId);
        if (!email) return;
        const { subject, html } = await this._buildEmail(
            orgId, 'territory_update', territoryUpdateEmailTemplate,
            { userName: name || 'there', territoryName, summary, territoryUrl },
            { ctaLabel: 'View Territory', ctaUrl: territoryUrl, title: 'Territory updated' }
        );
        const result = await mailer.send(email, subject, html);
        await this._log(orgId, userId, 'territory_update', email, result);
    }
}

export default NotificationService;
