import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class TerritoryController {
    constructor(territoryService) {
        this.territoryService = territoryService;
    }

    async createTerritory(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const { name, managerUserId } = req.body;
            const territory = await this.territoryService.createTerritory(orgId, { name, managerUserId });
            return res.json(ResponseFormatter.success('Territory created successfully', territory, 201));
        } catch (err) {
            next(err);
        }
    }

    async listTerritories(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const territories = await this.territoryService.getTerritories(orgId);
            return res.json(ResponseFormatter.success('Territories fetched successfully', territories, 200));
        } catch (err) {
            next(err);
        }
    }

    async getTerritory(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const territory = await this.territoryService.getTerritoryById(orgId, req.params.id);
            return res.json(ResponseFormatter.success('Territory fetched successfully', territory, 200));
        } catch (err) {
            next(err);
        }
    }

    async updateTerritory(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const { name, managerUserId, status } = req.body;
            const territory = await this.territoryService.updateTerritory(orgId, req.params.id, { name, managerUserId, status });
            return res.json(ResponseFormatter.success('Territory updated successfully', territory, 200));
        } catch (err) {
            next(err);
        }
    }

    async deleteTerritory(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            await this.territoryService.deleteTerritory(orgId, req.params.id);
            return res.json(ResponseFormatter.success('Territory deleted successfully', null, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default TerritoryController;
