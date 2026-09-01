import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import DepartmentService from '../modules/department/service/DepartmentService.js';
import DepartmentController from '../modules/department/controller/DepartmentController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

export async function initializeDepartmentRoutes() {
    try {
        const models = Database.getModels();
        const departmentService = new DepartmentService(models);
        const departmentController = new DepartmentController(departmentService);

        router.post('/', AuthMiddleware, PermissionMiddleware('manage_departments'), (req, res, next) => departmentController.createDepartment(req, res, next));
        router.get('/', AuthMiddleware, PermissionMiddleware('manage_departments'), (req, res, next) => departmentController.listDepartments(req, res, next));
        router.get('/:id', AuthMiddleware, PermissionMiddleware('manage_departments'), (req, res, next) => departmentController.getDepartment(req, res, next));
        router.put('/:id', AuthMiddleware, PermissionMiddleware('manage_departments'), (req, res, next) => departmentController.updateDepartment(req, res, next));
        router.delete('/:id', AuthMiddleware, PermissionMiddleware('manage_departments'), (req, res, next) => departmentController.deleteDepartment(req, res, next));

        Logger.info('Department routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing department routes:', err);
        throw err;
    }
}

export default initializeDepartmentRoutes;
