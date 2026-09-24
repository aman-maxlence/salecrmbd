import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import FormSchemaService from '../modules/formSchema/service/FormSchemaService.js';
import FormSchemaController from '../modules/formSchema/controller/FormSchemaController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Generic, entity-agnostic form-schema API - `:entityType` selects which
 * module's form is being read/edited (today: only 'inventory_item', see
 * formSchema/schemas/registry.js). Any future module reuses these same
 * routes/service rather than growing its own copy.
 */
export async function initializeFormSchemaRoutes() {
    try {
        const models = Database.getModels();
        const formSchemaService = new FormSchemaService(models);
        const controller = new FormSchemaController(formSchemaService);

        // Broad enough to cover every entity_type registered today - revisit
        // per-entity view permissions once a second module adopts this.
        const view = PermissionMiddleware(['view_inventory', 'manage_inventory', 'manage_form_schema', 'manage_organization_settings']);
        const manage = PermissionMiddleware('manage_form_schema');

        router.get('/:entityType', AuthMiddleware, view, (req, res, next) => controller.getSchema(req, res, next));
        router.post('/image-presigned-url', AuthMiddleware, view, (req, res, next) => controller.getImageFieldPresignedUrl(req, res, next));

        router.post('/:entityType/sections', AuthMiddleware, manage, (req, res, next) => controller.createSection(req, res, next));
        router.put('/:entityType/sections/reorder', AuthMiddleware, manage, (req, res, next) => controller.reorderSections(req, res, next));
        router.put('/sections/:id', AuthMiddleware, manage, (req, res, next) => controller.updateSection(req, res, next));
        router.delete('/sections/:id', AuthMiddleware, manage, (req, res, next) => controller.deleteSection(req, res, next));

        router.post('/:entityType/fields', AuthMiddleware, manage, (req, res, next) => controller.createField(req, res, next));
        router.put('/fields/reorder', AuthMiddleware, manage, (req, res, next) => controller.reorderFields(req, res, next));
        router.put('/fields/:id', AuthMiddleware, manage, (req, res, next) => controller.updateField(req, res, next));
        router.delete('/fields/:id', AuthMiddleware, manage, (req, res, next) => controller.deleteField(req, res, next));

        Logger.info('Form schema routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing form schema routes:', err);
        throw err;
    }
}

export default initializeFormSchemaRoutes;
