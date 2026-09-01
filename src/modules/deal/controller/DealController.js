import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class DealController {
    constructor(dealService) {
        this.dealService = dealService;
    }

    _orgId(req) {
        return req.user?.org?.id;
    }

    async listDeals(req, res, next) {
        try {
            const deals = await this.dealService.listDeals(this._orgId(req));
            return res.json(ResponseFormatter.success('Deals fetched successfully', deals, 200));
        } catch (err) {
            next(err);
        }
    }

    async createDeal(req, res, next) {
        try {
            const deal = await this.dealService.createDeal(this._orgId(req), req.body, req.user?.id ?? req.userId);
            return res.json(ResponseFormatter.success('Deal created successfully', deal, 201));
        } catch (err) {
            next(err);
        }
    }

    async getDeal(req, res, next) {
        try {
            const deal = await this.dealService.getDeal(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Deal fetched successfully', deal, 200));
        } catch (err) {
            next(err);
        }
    }

    async addLineItem(req, res, next) {
        try {
            const deal = await this.dealService.addLineItem(this._orgId(req), req.params.id, req.body);
            return res.json(ResponseFormatter.success('Item added to deal', deal, 201));
        } catch (err) {
            next(err);
        }
    }

    async removeLineItem(req, res, next) {
        try {
            const deal = await this.dealService.removeLineItem(this._orgId(req), req.params.id, req.params.lineId);
            return res.json(ResponseFormatter.success('Line item removed', deal, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default DealController;
