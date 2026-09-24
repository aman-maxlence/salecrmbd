import { emailLayout } from './layout.js';

export function welcomeEmailTemplate({ userName, orgName, dashboardUrl }) {
    return {
        subject: `Welcome to Sale CRM, ${userName}!`,
        html: emailLayout({
            title: 'Welcome to Sale CRM',
            heading: 'Welcome aboard! 🎉',
            bodyHtml: `
                <p style="margin:0 0 16px 0;font-size:15px;">Hi ${userName},</p>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#4b5563;">
                    You're all set to get started with <strong>${orgName}</strong>'s Sale CRM. We'll walk you through a
                    few quick steps to set up your account - it only takes a few minutes.
                </p>
            `,
            ctaLabel: 'Start Setup',
            ctaUrl: dashboardUrl,
        }),
    };
}

export function invitationAcceptedEmailTemplate({ inviterName, inviteeName, inviteeEmail, orgName, teamUrl }) {
    return {
        subject: `${inviteeName || inviteeEmail} joined ${orgName}`,
        html: emailLayout({
            title: 'Invitation accepted',
            heading: 'Your invite was accepted ✅',
            bodyHtml: `
                <p style="margin:0 0 16px 0;font-size:15px;">Hi ${inviterName},</p>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#4b5563;">
                    <strong>${inviteeName || inviteeEmail}</strong> just accepted your invitation and joined
                    <strong>${orgName}</strong> on Sale CRM.
                </p>
            `,
            ctaLabel: 'View Team',
            ctaUrl: teamUrl,
        }),
    };
}

export function dealUpdateEmailTemplate({ userName, dealTitle, summary, dealUrl }) {
    return {
        subject: `Update on "${dealTitle}"`,
        html: emailLayout({
            title: 'Deal updated',
            heading: 'Your deal was updated',
            bodyHtml: `
                <p style="margin:0 0 16px 0;font-size:15px;">Hi ${userName},</p>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#4b5563;">
                    <strong>${dealTitle}</strong> was just updated: ${summary}
                </p>
            `,
            ctaLabel: 'View Deal',
            ctaUrl: dealUrl,
        }),
    };
}

export function territoryUpdateEmailTemplate({ userName, territoryName, summary, territoryUrl }) {
    return {
        subject: `Update on your territory "${territoryName}"`,
        html: emailLayout({
            title: 'Territory updated',
            heading: 'Your territory was updated',
            bodyHtml: `
                <p style="margin:0 0 16px 0;font-size:15px;">Hi ${userName},</p>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#4b5563;">
                    <strong>${territoryName}</strong>, a territory you belong to, was just updated: ${summary}
                </p>
            `,
            ctaLabel: 'View Territory',
            ctaUrl: territoryUrl,
        }),
    };
}

export function invitationReminderEmailTemplate({ inviteeName, inviterName, orgName, acceptUrl }) {
    return {
        subject: `Reminder: you're invited to join ${orgName}`,
        html: emailLayout({
            title: 'Invitation reminder',
            heading: `Don't forget to join ${orgName}`,
            bodyHtml: `
                <p style="margin:0 0 16px 0;font-size:15px;">Hi ${inviteeName || 'there'},</p>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#4b5563;">
                    <strong>${inviterName}</strong> invited you to join <strong>${orgName}</strong> on Sale CRM, but
                    the invite is still waiting to be accepted. Check your inbox for the original invite email to
                    accept it - if you can't find it, ask ${inviterName} to resend it.
                </p>
            `,
            ctaLabel: 'Open Sale CRM',
            ctaUrl: acceptUrl,
        }),
    };
}

export function onboardingCompletionEmailTemplate({ userName, orgName, dashboardUrl }) {
    return {
        subject: `You're all set up, ${userName}!`,
        html: emailLayout({
            title: 'Onboarding complete',
            heading: "You're ready to go! 🚀",
            bodyHtml: `
                <p style="margin:0 0 16px 0;font-size:15px;">Hi ${userName},</p>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#4b5563;">
                    Your Sale CRM account for <strong>${orgName}</strong> is fully set up. You're ready to start
                    managing leads, deals, and your team.
                </p>
            `,
            ctaLabel: 'Go to Dashboard',
            ctaUrl: dashboardUrl,
        }),
    };
}
