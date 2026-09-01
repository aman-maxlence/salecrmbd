import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import TeamService from '../modules/team/service/TeamService.js';
import TeamController from '../modules/team/controller/TeamController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

export async function initializeTeamRoutes() {
    try {
        const models = Database.getModels();
        const teamService = new TeamService(models);
        const teamController = new TeamController(teamService);

        router.post('/', AuthMiddleware, PermissionMiddleware('manage_teams'), (req, res, next) => teamController.createTeam(req, res, next));
        router.get('/', AuthMiddleware, PermissionMiddleware('manage_teams'), (req, res, next) => teamController.listTeams(req, res, next));
        router.get('/:id', AuthMiddleware, PermissionMiddleware('manage_teams'), (req, res, next) => teamController.getTeam(req, res, next));
        router.put('/:id', AuthMiddleware, PermissionMiddleware('manage_teams'), (req, res, next) => teamController.updateTeam(req, res, next));
        router.delete('/:id', AuthMiddleware, PermissionMiddleware('manage_teams'), (req, res, next) => teamController.deleteTeam(req, res, next));

        Logger.info('Team routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing team routes:', err);
        throw err;
    }
}

export default initializeTeamRoutes;
