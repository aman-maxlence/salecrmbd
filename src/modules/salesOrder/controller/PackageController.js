import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class PackageController {
    constructor(packageService) {
        this.packageService = packageService;
    }

    _orgId(req) {
        return req.user?.org?.id;
    }

    _userId(req) {
        return req.user?.id ?? req.userId;
    }

    async list(req, res, next) {
        try {
            const packages = await this.packageService.list(this._orgId(req), { salesOrderId: req.query.salesOrderId });
            return res.json(ResponseFormatter.success('Packages fetched successfully', packages, 200));
        } catch (err) {
            next(err);
        }
    }

    async getById(req, res, next) {
        try {
            const pkg = await this.packageService.getById(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Package fetched successfully', pkg, 200));
        } catch (err) {
            next(err);
        }
    }

    async create(req, res, next) {
        try {
            const pkg = await this.packageService.create(this._orgId(req), req.body, this._userId(req));
            return res.json(ResponseFormatter.success('Package created successfully', pkg, 201));
        } catch (err) {
            next(err);
        }
    }

    async updateStatus(req, res, next) {
        try {
            const pkg = await this.packageService.updateStatus(this._orgId(req), req.params.id, req.body.status);
            return res.json(ResponseFormatter.success('Package status updated successfully', pkg, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default PackageController;
