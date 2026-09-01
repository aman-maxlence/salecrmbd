import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';

class TeamService {
    constructor(models) {
        this.models = models;
    }

    _includes() {
        const { Department, Territory, PortalUser } = this.models;
        return [
            { model: Department, as: 'department' },
            { model: Territory, as: 'territory' },
            { model: PortalUser, as: 'members' },
        ];
    }

    async createTeam(orgId, { name, departmentId, territoryId, description, managerUserId, memberUserIds }) {
        const { Team, Department, Territory, PortalUser } = this.models;

        const existing = await Team.findOne({ where: { org_id: orgId, name } });
        if (existing) {
            throw new AppError(`A team named "${name}" already exists in this org.`, 409, ErrorCode.CONFLICT);
        }

        const department = await Department.findOne({ where: { id: departmentId, org_id: orgId } });
        if (!department) {
            throw new AppError('Department not found.', 404, ErrorCode.NOT_FOUND);
        }

        const territory = await Territory.findOne({ where: { id: territoryId, org_id: orgId } });
        if (!territory) {
            throw new AppError('Territory not found.', 404, ErrorCode.NOT_FOUND);
        }

        const team = await Team.create({
            org_id: orgId,
            department_id: departmentId,
            territory_id: territoryId,
            name,
            description: description ?? null,
            manager_user_id: managerUserId ?? null,
            status: 'active',
        });

        if (Array.isArray(memberUserIds) && memberUserIds.length > 0) {
            // Only attach members who are actually in this org + this team's own
            // territory - a "Delhi" team can't pull in a "Mumbai" member.
            await PortalUser.update(
                { team_id: team.id },
                { where: { org_id: orgId, territory_id: territoryId, user_id: memberUserIds } }
            );
        }

        return this.getTeamById(orgId, team.id);
    }

    async getTeams(orgId, { territoryId, departmentId } = {}) {
        const { Team } = this.models;
        const where = { org_id: orgId };
        if (territoryId) where.territory_id = territoryId;
        if (departmentId) where.department_id = departmentId;

        return Team.findAll({ where, include: this._includes(), order: [['name', 'ASC']] });
    }

    async getTeamById(orgId, teamId) {
        const { Team } = this.models;
        const team = await Team.findOne({ where: { id: teamId, org_id: orgId }, include: this._includes() });
        if (!team) {
            throw new AppError('Team not found.', 404, ErrorCode.NOT_FOUND);
        }
        return team;
    }

    async updateTeam(orgId, teamId, { name, description, departmentId, territoryId, managerUserId, status, memberUserIds }) {
        const { Department, Territory, PortalUser } = this.models;
        const team = await this.getTeamById(orgId, teamId);

        if (name !== undefined) team.name = name;
        if (description !== undefined) team.description = description;
        if (managerUserId !== undefined) team.manager_user_id = managerUserId;
        if (status !== undefined) team.status = status;

        if (departmentId !== undefined) {
            const department = await Department.findOne({ where: { id: departmentId, org_id: orgId } });
            if (!department) {
                throw new AppError('Department not found.', 404, ErrorCode.NOT_FOUND);
            }
            team.department_id = departmentId;
        }

        let territoryChanged = false;
        if (territoryId !== undefined && String(territoryId) !== String(team.territory_id)) {
            const territory = await Territory.findOne({ where: { id: territoryId, org_id: orgId } });
            if (!territory) {
                throw new AppError('Territory not found.', 404, ErrorCode.NOT_FOUND);
            }
            team.territory_id = territoryId;
            territoryChanged = true;
        }

        await team.save();

        if (Array.isArray(memberUserIds)) {
            // Replace membership wholesale with the picker's current selection.
            await PortalUser.update({ team_id: null }, { where: { org_id: orgId, team_id: teamId } });
            if (memberUserIds.length > 0) {
                await PortalUser.update(
                    { team_id: teamId },
                    { where: { org_id: orgId, territory_id: team.territory_id, user_id: memberUserIds } }
                );
            }
        } else if (territoryChanged) {
            // Territory changed with no explicit new member list - the old
            // members almost certainly aren't in the new territory, so clear
            // membership rather than leave a team whose members live
            // somewhere else.
            await PortalUser.update({ team_id: null }, { where: { org_id: orgId, team_id: teamId } });
        }

        return this.getTeamById(orgId, teamId);
    }

    async deleteTeam(orgId, teamId) {
        const { PortalUser } = this.models;
        const team = await this.getTeamById(orgId, teamId);
        await PortalUser.update({ team_id: null }, { where: { org_id: orgId, team_id: teamId } });
        await team.destroy();
    }
}

export default TeamService;
