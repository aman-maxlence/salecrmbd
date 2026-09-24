import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class FormSchemaController {
    constructor(formSchemaService) {
        this.formSchemaService = formSchemaService;
    }

    _orgId(req) {
        return req.user?.org?.id;
    }

    async getSchema(req, res, next) {
        try {
            const tree = await this.formSchemaService.getSchema(this._orgId(req), req.params.entityType);
            return res.json(ResponseFormatter.success('Form schema fetched successfully', tree, 200));
        } catch (err) {
            next(err);
        }
    }

    async createSection(req, res, next) {
        try {
            const row = await this.formSchemaService.createSection(this._orgId(req), req.params.entityType, req.body);
            return res.json(ResponseFormatter.success('Section created successfully', row, 201));
        } catch (err) {
            next(err);
        }
    }

    async updateSection(req, res, next) {
        try {
            const row = await this.formSchemaService.updateSection(this._orgId(req), req.params.id, req.body);
            return res.json(ResponseFormatter.success('Section updated successfully', row, 200));
        } catch (err) {
            next(err);
        }
    }

    async deleteSection(req, res, next) {
        try {
            await this.formSchemaService.deleteSection(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Section deleted successfully', null, 200));
        } catch (err) {
            next(err);
        }
    }

    async reorderSections(req, res, next) {
        try {
            const rows = await this.formSchemaService.reorderSections(this._orgId(req), req.params.entityType, req.body?.orderedIds);
            return res.json(ResponseFormatter.success('Sections reordered successfully', rows, 200));
        } catch (err) {
            next(err);
        }
    }

    async createField(req, res, next) {
        try {
            const row = await this.formSchemaService.createField(this._orgId(req), req.params.entityType, req.body);
            return res.json(ResponseFormatter.success('Field created successfully', row, 201));
        } catch (err) {
            next(err);
        }
    }

    async updateField(req, res, next) {
        try {
            const row = await this.formSchemaService.updateField(this._orgId(req), req.params.id, req.body);
            return res.json(ResponseFormatter.success('Field updated successfully', row, 200));
        } catch (err) {
            next(err);
        }
    }

    async deleteField(req, res, next) {
        try {
            await this.formSchemaService.deleteField(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Field deleted successfully', null, 200));
        } catch (err) {
            next(err);
        }
    }

    async reorderFields(req, res, next) {
        try {
            const rows = await this.formSchemaService.reorderFields(this._orgId(req), req.body?.sectionId, req.body?.orderedIds);
            return res.json(ResponseFormatter.success('Fields reordered successfully', rows, 200));
        } catch (err) {
            next(err);
        }
    }

    async getImageFieldPresignedUrl(req, res, next) {
        try {
            const result = await this.formSchemaService.getImageFieldPresignedUrl(this._orgId(req), req.body.filename, req.body.contentType);
            return res.json(ResponseFormatter.success('Presigned upload URL generated successfully', result, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default FormSchemaController;
