import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class PurchaseOrderController {
    constructor(purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    _orgId(req) {
        return req.user?.org?.id;
    }

    _userId(req) {
        return req.user?.id ?? req.userId;
    }

    async list(req, res, next) {
        try {
            const orders = await this.purchaseOrderService.list(this._orgId(req), {
                status: req.query.status,
                vendorId: req.query.vendorId,
            });
            return res.json(ResponseFormatter.success('Purchase orders fetched successfully', orders, 200));
        } catch (err) {
            next(err);
        }
    }

    async getById(req, res, next) {
        try {
            const order = await this.purchaseOrderService.getById(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Purchase order fetched successfully', order, 200));
        } catch (err) {
            next(err);
        }
    }

    async create(req, res, next) {
        try {
            const order = await this.purchaseOrderService.create(this._orgId(req), req.body, this._userId(req));
            return res.json(ResponseFormatter.success('Purchase order created successfully', order, 201));
        } catch (err) {
            next(err);
        }
    }

    async cancel(req, res, next) {
        try {
            const order = await this.purchaseOrderService.cancel(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Purchase order cancelled successfully', order, 200));
        } catch (err) {
            next(err);
        }
    }

    async receive(req, res, next) {
        try {
            const order = await this.purchaseOrderService.receive(this._orgId(req), req.params.id, req.body, this._userId(req));
            return res.json(ResponseFormatter.success('Purchase order received successfully', order, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default PurchaseOrderController;
