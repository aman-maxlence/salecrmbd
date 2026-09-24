import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import CountryService from '../modules/country/service/CountryService.js';
import CountryController from '../modules/country/controller/CountryController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

export async function initializeCountryRoutes() {
    try {
        const models = Database.getModels();
        const countryService = new CountryService(models);
        const countryController = new CountryController(countryService);

        router.post('/', AuthMiddleware, PermissionMiddleware('manage_territories'), (req, res, next) => countryController.createCountry(req, res, next));
        router.get('/', AuthMiddleware, PermissionMiddleware('manage_territories'), (req, res, next) => countryController.listCountries(req, res, next));
        router.get('/:id', AuthMiddleware, PermissionMiddleware('manage_territories'), (req, res, next) => countryController.getCountry(req, res, next));
        router.put('/:id', AuthMiddleware, PermissionMiddleware('manage_territories'), (req, res, next) => countryController.updateCountry(req, res, next));
        router.delete('/:id', AuthMiddleware, PermissionMiddleware('manage_territories'), (req, res, next) => countryController.deleteCountry(req, res, next));

        Logger.info('Country routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing country routes:', err);
        throw err;
    }
}

export default initializeCountryRoutes;
