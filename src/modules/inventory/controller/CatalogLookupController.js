import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class CatalogLookupController {
    /** @param {string} resourceLabel - e.g. "Category", used in response messages */
    constructor(service, resourceLabel) {
        this.service = service;
        this.resourceLabel = resourceLabel;
    }

    _orgId(req) {
        return req.user?.org?.id;
    }

    async list(req, res, next) {
        try {
            const rows = await this.service.list(this._orgId(req));
            return res.json(ResponseFormatter.success(`${this.resourceLabel}s fetched successfully`, rows, 200));
        } catch (err) {
            next(err);
        }
    }

    async create(req, res, next) {
        try {
            const row = await this.service.create(this._orgId(req), { name: req.body.name, parentId: req.body.parentId });
            return res.json(ResponseFormatter.success(`${this.resourceLabel} created successfully`, row, 201));
        } catch (err) {
            next(err);
        }
    }

    async update(req, res, next) {
        try {
            const row = await this.service.update(this._orgId(req), req.params.id, { name: req.body.name, parentId: req.body.parentId });
            return res.json(ResponseFormatter.success(`${this.resourceLabel} updated successfully`, row, 200));
        } catch (err) {
            next(err);
        }
    }

    async delete(req, res, next) {
        try {
            await this.service.delete(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success(`${this.resourceLabel} deleted successfully`, null, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default CatalogLookupController;
