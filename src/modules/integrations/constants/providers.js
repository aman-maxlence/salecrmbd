/**
 * The generic third-party integration framework's provider registry
 * (Integration Setup checklist). Adding a new provider is just adding an
 * entry here - IntegrationService's connect/callback/disconnect flow is
 * entirely generic over this shape, nothing provider-specific is
 * hardcoded elsewhere.
 *
 * `clientIdEnv`/`clientSecretEnv` name the environment variables that must
 * be set (in environments/<env>/.env) before a real OAuth handshake will
 * work for that provider - each requires registering a real OAuth app in
 * that provider's own developer console (redirect URI:
 * `${APP_PUBLIC_URL}/api/integrations/callback/<key>`) to obtain them.
 * Until set, `isConfigured` is false and the "Connect" action is disabled
 * client-side (IntegrationService.initiateConnection also re-checks this
 * server-side, so it can't be bypassed).
 */
export const INTEGRATION_PROVIDERS = [
    {
        key: 'google_calendar',
        name: 'Google Calendar',
        description: 'Sync meetings and tasks with your Google Calendar.',
        required: false,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/userinfo.email'],
        clientIdEnv: 'GOOGLE_INTEGRATION_CLIENT_ID',
        clientSecretEnv: 'GOOGLE_INTEGRATION_CLIENT_SECRET',
        extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    },
    {
        key: 'slack',
        name: 'Slack',
        description: 'Get notified in Slack when deals move or new leads come in.',
        required: false,
        authUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        scopes: ['chat:write', 'channels:read'],
        clientIdEnv: 'SLACK_INTEGRATION_CLIENT_ID',
        clientSecretEnv: 'SLACK_INTEGRATION_CLIENT_SECRET',
        extraAuthParams: {},
    },
];

export function getProvider(key) {
    return INTEGRATION_PROVIDERS.find((p) => p.key === key) ?? null;
}

export function isProviderConfigured(provider) {
    return Boolean(process.env[provider.clientIdEnv] && process.env[provider.clientSecretEnv]);
}
