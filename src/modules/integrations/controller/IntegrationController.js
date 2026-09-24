import ResponseFormatter from '../../../utils/ResponseFormatter.js';
import config from '../../../config/config.js';

class IntegrationController {
    constructor(integrationService) {
        this.integrationService = integrationService;
    }

    async listProviders(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const providers = await this.integrationService.listProviders(orgId);
            return res.json(ResponseFormatter.success('Integrations fetched successfully', providers, 200));
        } catch (err) {
            next(err);
        }
    }

    async connect(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const userId = req.user?.id ?? req.userId;
            const authorizeUrl = await this.integrationService.initiateConnection(orgId, userId, req.params.providerKey);
            return res.json(ResponseFormatter.success('Authorization URL created', { authorizeUrl }, 200));
        } catch (err) {
            next(err);
        }
    }

    async disconnect(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const actorUserId = req.user?.id ?? req.userId;
            await this.integrationService.disconnect(orgId, req.params.providerKey, actorUserId);
            return res.json(ResponseFormatter.success('Integration disconnected successfully', null, 200));
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /api/integrations/callback/:providerKey - loaded by the provider's
     * own redirect (a plain browser navigation, not an API call from our
     * frontend), so this always responds with a redirect to a small
     * frontend page rather than a JSON error, even on failure.
     */
    async callback(req, res) {
        const providerKey = req.params.providerKey;
        const target = new URL('/integrations/callback-complete', config.emailConfig.SALE_CRM_FRONTEND_URL);
        target.searchParams.set('provider', providerKey);

        try {
            const { providerName } = await this.integrationService.handleCallback(providerKey, req.query);
            target.searchParams.set('status', 'success');
            target.searchParams.set('providerName', providerName);
        } catch (err) {
            target.searchParams.set('status', 'error');
            target.searchParams.set('message', err.message || 'Connection failed');
        }

        return res.redirect(target.toString());
    }
}

export default IntegrationController;
