import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class PushController {
    constructor(pushService) {
        this.pushService = pushService;
    }

    _ctx(req) {
        return { orgId: req.user?.org?.id, userId: req.user?.id ?? req.userId };
    }

    async getPublicKey(req, res, next) {
        try {
            return res.json(ResponseFormatter.success('Public key fetched successfully', {
                publicKey: this.pushService.getPublicKey(),
                configured: this.pushService.isConfigured(),
            }, 200));
        } catch (err) {
            next(err);
        }
    }

    async subscribe(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            await this.pushService.subscribe(orgId, userId, req.body);
            return res.json(ResponseFormatter.success('Subscribed successfully', null, 201));
        } catch (err) {
            next(err);
        }
    }

    async unsubscribe(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            await this.pushService.unsubscribe(orgId, userId, req.body?.endpoint);
            return res.json(ResponseFormatter.success('Unsubscribed successfully', null, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default PushController;
