import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class VendorController {
    constructor(vendorService) {
        this.vendorService = vendorService;
    }

    _orgId(req) {
        return req.user?.org?.id;
    }

    async list(req, res, next) {
        try {
            const vendors = await this.vendorService.list(this._orgId(req), { status: req.query.status });
            return res.json(ResponseFormatter.success('Vendors fetched successfully', vendors, 200));
        } catch (err) {
            next(err);
        }
    }

    async getById(req, res, next) {
        try {
            const vendor = await this.vendorService.getById(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Vendor fetched successfully', vendor, 200));
        } catch (err) {
            next(err);
        }
    }

    async create(req, res, next) {
        try {
            const vendor = await this.vendorService.create(this._orgId(req), req.body);
            return res.json(ResponseFormatter.success('Vendor created successfully', vendor, 201));
        } catch (err) {
            next(err);
        }
    }

    async update(req, res, next) {
        try {
            const vendor = await this.vendorService.update(this._orgId(req), req.params.id, req.body);
            return res.json(ResponseFormatter.success('Vendor updated successfully', vendor, 200));
        } catch (err) {
            next(err);
        }
    }

    async delete(req, res, next) {
        try {
            await this.vendorService.delete(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Vendor deleted successfully', null, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default VendorController;
