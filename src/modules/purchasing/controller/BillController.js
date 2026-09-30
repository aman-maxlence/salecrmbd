import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class BillController {
    constructor(billService) {
        this.billService = billService;
    }

    _orgId(req) {
        return req.user?.org?.id;
    }

    _userId(req) {
        return req.user?.id ?? req.userId;
    }

    async list(req, res, next) {
        try {
            const bills = await this.billService.list(this._orgId(req), {
                status: req.query.status,
                vendorId: req.query.vendorId,
            });
            return res.json(ResponseFormatter.success('Bills fetched successfully', bills, 200));
        } catch (err) {
            next(err);
        }
    }

    async getById(req, res, next) {
        try {
            const bill = await this.billService.getById(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Bill fetched successfully', bill, 200));
        } catch (err) {
            next(err);
        }
    }

    async update(req, res, next) {
        try {
            const bill = await this.billService.update(this._orgId(req), req.params.id, req.body);
            return res.json(ResponseFormatter.success('Bill updated successfully', bill, 200));
        } catch (err) {
            next(err);
        }
    }

    async recordPayment(req, res, next) {
        try {
            const bill = await this.billService.recordPayment(this._orgId(req), req.params.id, req.body, this._userId(req));
            return res.json(ResponseFormatter.success('Payment recorded successfully', bill, 200));
        } catch (err) {
            next(err);
        }
    }

    async void(req, res, next) {
        try {
            const bill = await this.billService.void(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Bill voided successfully', bill, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default BillController;
