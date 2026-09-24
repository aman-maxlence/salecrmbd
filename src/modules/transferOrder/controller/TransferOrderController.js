import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class TransferOrderController {
    constructor(transferOrderService) {
        this.transferOrderService = transferOrderService;
    }

    _orgId(req) {
        return req.user?.org?.id;
    }

    _userId(req) {
        return req.user?.id ?? req.userId;
    }

    async list(req, res, next) {
        try {
            const orders = await this.transferOrderService.list(this._orgId(req), { status: req.query.status });
            return res.json(ResponseFormatter.success('Transfer orders fetched successfully', orders, 200));
        } catch (err) {
            next(err);
        }
    }

    async getById(req, res, next) {
        try {
            const order = await this.transferOrderService.getById(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Transfer order fetched successfully', order, 200));
        } catch (err) {
            next(err);
        }
    }

    async create(req, res, next) {
        try {
            const order = await this.transferOrderService.create(this._orgId(req), req.body, this._userId(req));
            return res.json(ResponseFormatter.success('Transfer order created successfully', order, 201));
        } catch (err) {
            next(err);
        }
    }

    async cancel(req, res, next) {
        try {
            const order = await this.transferOrderService.cancel(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Transfer order cancelled successfully', order, 200));
        } catch (err) {
            next(err);
        }
    }

    async ship(req, res, next) {
        try {
            const order = await this.transferOrderService.ship(this._orgId(req), req.params.id, req.body, this._userId(req));
            return res.json(ResponseFormatter.success('Transfer order shipped successfully', order, 200));
        } catch (err) {
            next(err);
        }
    }

    async receive(req, res, next) {
        try {
            const order = await this.transferOrderService.receive(this._orgId(req), req.params.id, req.body, this._userId(req));
            return res.json(ResponseFormatter.success('Transfer order received successfully', order, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default TransferOrderController;
