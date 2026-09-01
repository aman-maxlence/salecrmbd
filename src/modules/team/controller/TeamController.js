import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class TeamController {
    constructor(teamService) {
        this.teamService = teamService;
    }

    async createTeam(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const { name, departmentId, territoryId, description, managerUserId, memberUserIds } = req.body;
            const team = await this.teamService.createTeam(orgId, {
                name, departmentId, territoryId, description, managerUserId, memberUserIds,
            });
            return res.json(ResponseFormatter.success('Team created successfully', team, 201));
        } catch (err) {
            next(err);
        }
    }

    async listTeams(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const { territoryId, departmentId } = req.query;
            const teams = await this.teamService.getTeams(orgId, { territoryId, departmentId });
            return res.json(ResponseFormatter.success('Teams fetched successfully', teams, 200));
        } catch (err) {
            next(err);
        }
    }

    async getTeam(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const team = await this.teamService.getTeamById(orgId, req.params.id);
            return res.json(ResponseFormatter.success('Team fetched successfully', team, 200));
        } catch (err) {
            next(err);
        }
    }

    async updateTeam(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const { name, description, departmentId, territoryId, managerUserId, status, memberUserIds } = req.body;
            const team = await this.teamService.updateTeam(orgId, req.params.id, {
                name, description, departmentId, territoryId, managerUserId, status, memberUserIds,
            });
            return res.json(ResponseFormatter.success('Team updated successfully', team, 200));
        } catch (err) {
            next(err);
        }
    }

    async deleteTeam(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            await this.teamService.deleteTeam(orgId, req.params.id);
            return res.json(ResponseFormatter.success('Team deleted successfully', null, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default TeamController;
