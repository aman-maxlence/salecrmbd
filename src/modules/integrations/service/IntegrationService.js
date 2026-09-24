import axios from 'axios';
import jwt from 'jsonwebtoken';
import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { Logger } from '../../../utils/index.js';
import CryptoHelper from '../../../utils/CryptoHelper.js';
import config from '../../../config/config.js';
import { INTEGRATION_PROVIDERS, getProvider, isProviderConfigured } from '../constants/providers.js';
import AuditLogService from '../../auditLog/service/AuditLogService.js';
import AnalyticsService from '../../analytics/service/AnalyticsService.js';

const STATE_TTL_SECONDS = 10 * 60; // 10 minutes to complete the provider's consent screen

class IntegrationService {
    constructor(models) {
        this.models = models;
        this.auditLogService = new AuditLogService(models);
        this.analyticsService = new AnalyticsService(models);
    }

    /**
     * The registry merged with this org's actual connection rows - what
     * both the Settings page and the onboarding Integrations step render.
     * Every provider always appears, connected or not, so "optional
     * integrations can be skipped" has something real to skip past rather
     * than an empty list.
     */
    async listProviders(orgId) {
        const { IntegrationConnection } = this.models;
        const rows = await IntegrationConnection.findAll({ where: { org_id: orgId } });
        const byKey = new Map(rows.map((r) => [r.provider_key, r]));

        return INTEGRATION_PROVIDERS.map((provider) => {
            const row = byKey.get(provider.key);
            const isExpired = Boolean(
                row?.status === 'connected' && row.token_expires_at && new Date(row.token_expires_at).getTime() < Date.now()
            );
            return {
                key: provider.key,
                name: provider.name,
                description: provider.description,
                required: provider.required,
                isConfigured: isProviderConfigured(provider),
                status: row ? (isExpired ? 'expired' : row.status) : 'disconnected',
                externalAccountId: row?.external_account_id ?? null,
                connectedAt: row?.status === 'connected' ? row.updated_at : null,
                lastError: row?.last_error ?? null,
            };
        });
    }

    /**
     * Builds the provider's consent-screen URL. `state` is a short-lived
     * signed JWT (not a server-side session) carrying org/user/provider, so
     * the callback - hit directly by the provider's redirect, with no
     * access to this app's session - can verify who initiated it and for
     * which org without a separate state store.
     */
    async initiateConnection(orgId, userId, providerKey) {
        const provider = getProvider(providerKey);
        if (!provider) {
            throw new AppError(`Unknown integration provider: ${providerKey}.`, 400, ErrorCode.VALIDATION_ERROR);
        }
        if (!isProviderConfigured(provider)) {
            throw new AppError(
                `${provider.name} isn't configured on this server yet (missing ${provider.clientIdEnv}/${provider.clientSecretEnv}).`,
                503,
                ErrorCode.SERVICE_UNAVAILABLE
            );
        }

        const state = jwt.sign({ orgId, userId, providerKey }, config.JWT_SECRET, { expiresIn: STATE_TTL_SECONDS });
        const redirectUri = this._redirectUri(providerKey);
        const params = new URLSearchParams({
            client_id: process.env[provider.clientIdEnv],
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: provider.scopes.join(' '),
            state,
            ...provider.extraAuthParams,
        });

        return `${provider.authUrl}?${params.toString()}`;
    }

    _redirectUri(providerKey) {
        return `${config.app.publicBaseUrl}/api/integrations/callback/${providerKey}`;
    }

    /**
     * Handles the provider's redirect back after consent. Never throws past
     * this point in a way the caller can't render as a friendly page -
     * IntegrationController converts everything here into a redirect to the
     * frontend's callback-complete page with a status query param, since
     * this endpoint is loaded by the provider's own redirect, not called by
     * our frontend directly.
     */
    async handleCallback(providerKey, { code, state, error: providerError }) {
        const provider = getProvider(providerKey);
        if (!provider) {
            throw new AppError(`Unknown integration provider: ${providerKey}.`, 400, ErrorCode.VALIDATION_ERROR);
        }

        let payload;
        try {
            payload = jwt.verify(state, config.JWT_SECRET);
        } catch {
            throw new AppError('This connection request expired or is invalid. Please try connecting again.', 400, ErrorCode.VALIDATION_ERROR);
        }
        const { orgId, userId } = payload;

        if (providerError) {
            await this._recordFailure(orgId, providerKey, `Authorization was denied or failed: ${providerError}`);
            throw new AppError(`${provider.name} authorization was cancelled or denied.`, 400, ErrorCode.VALIDATION_ERROR);
        }

        try {
            const tokenResponse = await axios.post(
                provider.tokenUrl,
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: this._redirectUri(providerKey),
                    client_id: process.env[provider.clientIdEnv],
                    client_secret: process.env[provider.clientSecretEnv],
                }).toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            const { access_token, refresh_token, expires_in, authed_user, team } = tokenResponse.data;
            if (!access_token) {
                throw new Error(tokenResponse.data?.error || 'Provider did not return an access token.');
            }

            const externalAccountId = team?.id || team?.name || authed_user?.id || null;
            const row = await this._upsertConnection(orgId, userId, providerKey, {
                status: 'connected',
                external_account_id: externalAccountId,
                access_token: CryptoHelper.encrypt(access_token),
                refresh_token: CryptoHelper.encrypt(refresh_token ?? null),
                token_expires_at: expires_in ? new Date(Date.now() + expires_in * 1000) : null,
                connected_by_user_id: userId,
                last_error: null,
            });

            await this.auditLogService.record(orgId, userId, 'integration.connected', {
                entityType: 'integration_connection', entityId: row.id, details: { providerKey, externalAccountId },
            });

            return { orgId, providerKey, providerName: provider.name };
        } catch (err) {
            const message = err.response?.data?.error_description || err.response?.data?.error || err.message;
            await this._recordFailure(orgId, providerKey, message, userId);
            throw new AppError(`Failed to connect ${provider.name}: ${message}`, 502, ErrorCode.SERVICE_UNAVAILABLE);
        }
    }

    async _upsertConnection(orgId, userId, providerKey, fields) {
        const { IntegrationConnection } = this.models;
        const [row] = await IntegrationConnection.findOrCreate({
            where: { org_id: orgId, provider_key: providerKey },
            defaults: { org_id: orgId, provider_key: providerKey, connected_by_user_id: userId, ...fields },
        });
        Object.assign(row, fields);
        await row.save();
        return row;
    }

    async _recordFailure(orgId, providerKey, message, userId = null) {
        try {
            await this._upsertConnection(orgId, userId, providerKey, {
                status: 'failed',
                last_error: { message: String(message).slice(0, 500), occurredAt: new Date().toISOString() },
            });
            await this.analyticsService.track(orgId, userId, 'integration_failed', {
                step: 'integrations', details: { providerKey, message: String(message).slice(0, 500) },
            });
        } catch (err) {
            Logger.error('[IntegrationService] Failed to record integration failure:', err);
        }
    }

    /** Clears the stored connection entirely - a fresh "Connect" starts a clean handshake, not a resume of stale tokens. */
    async disconnect(orgId, providerKey, actorUserId = null) {
        const { IntegrationConnection } = this.models;
        const row = await IntegrationConnection.findOne({ where: { org_id: orgId, provider_key: providerKey } });
        if (!row) {
            throw new AppError('This integration is not connected.', 404, ErrorCode.NOT_FOUND);
        }
        await row.destroy();
        await this.auditLogService.record(orgId, actorUserId, 'integration.disconnected', {
            entityType: 'integration_connection', entityId: row.id, details: { providerKey },
        });
    }
}

export default IntegrationService;
