import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class SalesOrderController {
    constructor(salesOrderService) {
        this.salesOrderService = salesOrderService;
    }

    _orgId(req) {
        return req.user?.org?.id;
    }

    _userId(req) {
        return req.user?.id ?? req.userId;
    }

    async list(req, res, next) {
        try {
            const orders = await this.salesOrderService.list(this._orgId(req), {
                status: req.query.status,
                dealId: req.query.dealId,
            });
            return res.json(ResponseFormatter.success('Sales orders fetched successfully', orders, 200));
        } catch (err) {
            next(err);
        }
    }

    async getById(req, res, next) {
        try {
            const order = await this.salesOrderService.getById(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Sales order fetched successfully', order, 200));
        } catch (err) {
            next(err);
        }
    }

    async create(req, res, next) {
        try {
            const order = await this.salesOrderService.create(this._orgId(req), req.body, this._userId(req));
            return res.json(ResponseFormatter.success('Sales order created successfully', order, 201));
        } catch (err) {
            next(err);
        }
    }

    async cancel(req, res, next) {
        try {
            const order = await this.salesOrderService.cancel(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Sales order cancelled successfully', order, 200));
        } catch (err) {
            next(err);
        }
    }

    async fulfill(req, res, next) {
        try {
            const order = await this.salesOrderService.fulfill(this._orgId(req), req.params.id, req.body, this._userId(req));
            return res.json(ResponseFormatter.success('Sales order fulfilled successfully', order, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default SalesOrderController;
