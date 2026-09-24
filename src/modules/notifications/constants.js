/**
 * One entry per email this app can send. Shared by the NotificationTemplate
 * model (ENUM values), NotificationTemplateService (defaults + validation of
 * which type/variables an override is allowed to use), and the frontend's
 * "Notification Templates" admin page (labels, descriptions, placeholder hints).
 */
export const NOTIFICATION_TEMPLATE_TYPES = [
    {
        type:            'onboarding_welcome',
        label:           'Welcome email',
        description:     'Sent when a new org finishes signing up, before onboarding starts.',
        variables:       ['userName', 'orgName'],
        defaultSubject:  'Welcome to Sale CRM, {{userName}}!',
        defaultHeading:  'Welcome aboard!',
    },
    {
        type:            'invitation_accepted',
        label:           'Invitation accepted',
        description:     'Sent to the inviter when someone they invited joins the org.',
        variables:       ['inviterName', 'inviteeName', 'inviteeEmail', 'orgName'],
        defaultSubject:  '{{inviteeName}} joined {{orgName}}',
        defaultHeading:  'Your invite was accepted',
    },
    {
        type:            'invitation_reminder',
        label:           'Invitation reminder',
        description:     'Sent to a pending invitee who has not yet accepted their invite.',
        variables:       ['inviteeName', 'inviterName', 'orgName'],
        defaultSubject:  "Reminder: you're invited to join {{orgName}}",
        defaultHeading:  "Don't forget to join {{orgName}}",
    },
    {
        type:            'onboarding_completion',
        label:           'Onboarding completed',
        description:     'Sent when a user finishes the onboarding wizard.',
        variables:       ['userName', 'orgName'],
        defaultSubject:  "You're all set up, {{userName}}!",
        defaultHeading:  "You're ready to go!",
    },
    {
        type:            'deal_update',
        label:           'Deal update',
        description:     'Sent to a deal owner when their deal changes, if they have this preference enabled.',
        variables:       ['userName', 'dealTitle', 'summary'],
        defaultSubject:  'Update on "{{dealTitle}}"',
        defaultHeading:  'Your deal was updated',
    },
    {
        type:            'territory_update',
        label:           'Territory update',
        description:     'Sent to territory members when their territory changes, if they have this preference enabled.',
        variables:       ['userName', 'territoryName', 'summary'],
        defaultSubject:  'Update on your territory "{{territoryName}}"',
        defaultHeading:  'Your territory was updated',
    },
];

export const NOTIFICATION_TEMPLATE_TYPE_VALUES = NOTIFICATION_TEMPLATE_TYPES.map((t) => t.type);
