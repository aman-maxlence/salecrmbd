import axios from 'axios';
import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import config from '../../../config/config.js';

/**
 * Thin wrapper around Technogex's dedicated `/integrations/crm-sync/*`
 * export endpoints (see tecnogex_new_backend's serviceApiKeyAuth middleware) -
 * machine-to-machine only, no end-user JWT involved.
 */
class TechnogexApiClient {
    async _get(path, { since } = {}) {
        const url = `${config.technogex.url}/integrations/crm-sync/${path}`;
        try {
            const response = await axios.get(url, {
                params: since ? { since } : undefined,
                headers: { 'X-Service-Api-Key': config.technogex.apiKey },
                timeout: 30_000,
            });
            return response.data?.data ?? [];
        } catch (err) {
            if (err.response) {
                throw new AppError(
                    err.response.data?.message || 'Technogex rejected the sync request',
                    err.response.status,
                    ErrorCode.VALIDATION_ERROR
                );
            }
            throw new AppError(`Failed to reach Technogex: ${err.message}`, 502, ErrorCode.SERVICE_UNAVAILABLE);
        }
    }

    /** Each Products row is nested with its ProductPackages (see crmSyncExport.controller.js). */
    fetchProducts({ since } = {}) {
        return this._get('products', { since });
    }

    fetchDesignItems({ since } = {}) {
        return this._get('design-items', { since });
    }

    /** Each ValuePack row is nested with its tiers (see crmSyncExport.controller.js). */
    fetchValuePacks({ since } = {}) {
        return this._get('value-packs', { since });
    }
}

export default TechnogexApiClient;
