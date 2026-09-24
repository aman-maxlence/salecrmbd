import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import AuditLogService from '../../auditLog/service/AuditLogService.js';

class TeamService {
    constructor(models) {
        this.models = models;
        this.auditLogService = new AuditLogService(models);
    }

    _includes() {
        const { Department, Territory, Country, PortalUser } = this.models;
        return [
            {
                model: Department,
                as: 'department',
                include: [{ model: Territory, as: 'territory', include: [{ model: Country, as: 'country' }] }],
            },
            { model: Territory, as: 'territory', include: [{ model: Country, as: 'country' }] },
            { model: PortalUser, as: 'members' },
        ];
    }

    async createTeam(orgId, { name, departmentId, description, managerUserId, memberUserIds }, actorUserId = null) {
        const { Team, Department, PortalUser } = this.models;

        const trimmedName = name?.trim();
        if (!trimmedName) {
            throw new AppError('Team name is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const department = await Department.findOne({ where: { id: departmentId, org_id: orgId } });
        if (!department) {
            throw new AppError('Department not found.', 404, ErrorCode.NOT_FOUND);
        }

        const existing = await Team.findOne({ where: { org_id: orgId, department_id: departmentId, name: trimmedName } });
        if (existing) {
            throw new AppError(`A team named "${trimmedName}" already exists in this department.`, 409, ErrorCode.CONFLICT);
        }

        // territory_id is always derived from the department, never an
        // independent input - the chain is Country -> Territory ->
        // Department -> Team.
        const territoryId = department.territory_id;

        const team = await Team.create({
            org_id: orgId,
            department_id: departmentId,
            territory_id: territoryId,
            name: trimmedName,
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

        // Audit & History checklist #5 "record team assignments" - the team
        // itself and whoever it was created with as members.
        await this.auditLogService.record(orgId, actorUserId, 'team.created', {
            entityType: 'team', entityId: team.id,
            details: { name: trimmedName, departmentId, memberUserIds: memberUserIds ?? [] },
        });

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

    async updateTeam(orgId, teamId, { name, description, departmentId, managerUserId, status, memberUserIds }, actorUserId = null) {
        const { Team, Department, PortalUser } = this.models;
        const team = await this.getTeamById(orgId, teamId);
        const previousMemberIds = (team.members ?? []).map((m) => m.user_id);
        const previousDepartmentId = team.department_id;

        const nameChanging = name !== undefined && name !== team.name;
        let trimmedName;
        if (nameChanging) {
            trimmedName = name?.trim();
            if (!trimmedName) {
                throw new AppError('Team name is required.', 400, ErrorCode.VALIDATION_ERROR);
            }
        }

        if (description !== undefined) team.description = description;
        if (managerUserId !== undefined) team.manager_user_id = managerUserId;
        if (status !== undefined) team.status = status;

        // territory_id is always derived from the department, never an
        // independent input. Changing department re-derives it.
        let territoryChanged = false;
        if (departmentId !== undefined && String(departmentId) !== String(team.department_id)) {
            const department = await Department.findOne({ where: { id: departmentId, org_id: orgId } });
            if (!department) {
                throw new AppError('Department not found.', 404, ErrorCode.NOT_FOUND);
            }
            team.department_id = departmentId;
            if (String(department.territory_id) !== String(team.territory_id)) {
                team.territory_id = department.territory_id;
                territoryChanged = true;
            }
        }

        // Re-check the same (org, department, name) uniqueness createTeam
        // enforces - a rename or a department move can both produce a
        // clash that would otherwise only surface as a raw DB unique-
        // constraint error instead of this friendly message.
        if (nameChanging || departmentId !== undefined) {
            const clash = await Team.findOne({
                where: { org_id: orgId, department_id: team.department_id, name: trimmedName ?? team.name },
            });
            if (clash && clash.id !== team.id) {
                throw new AppError(`A team named "${trimmedName ?? team.name}" already exists in this department.`, 409, ErrorCode.CONFLICT);
            }
        }
        if (nameChanging) team.name = trimmedName;

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
            // Audit & History checklist #5 "record team assignments" - the
            // team editor's bulk replace was previously entirely unaudited,
            // unlike the single-user path in PortalUserService.
            await this.auditLogService.record(orgId, actorUserId, 'team.members_replaced', {
                entityType: 'team', entityId: team.id,
                details: { previousMemberIds, newMemberIds: memberUserIds },
            });
        } else if (territoryChanged) {
            // Department (and with it, territory) changed with no explicit
            // new member list - the old members almost certainly aren't in
            // the new territory, so clear membership rather than leave a
            // team whose members live somewhere else.
            await PortalUser.update({ team_id: null }, { where: { org_id: orgId, team_id: teamId } });
            if (previousMemberIds.length > 0) {
                await this.auditLogService.record(orgId, actorUserId, 'team.members_cleared', {
                    entityType: 'team', entityId: team.id,
                    details: { previousMemberIds, reason: 'department_changed' },
                });
            }
        }

        // Audit & History checklist #5 - the team's own field changes
        // (name/department/manager/status), separate from its membership.
        const changedFields = {};
        if (nameChanging) changedFields.name = trimmedName;
        if (description !== undefined) changedFields.description = description;
        if (departmentId !== undefined && String(departmentId) !== String(previousDepartmentId)) changedFields.departmentId = departmentId;
        if (managerUserId !== undefined) changedFields.managerUserId = managerUserId;
        if (status !== undefined) changedFields.status = status;
        if (Object.keys(changedFields).length > 0) {
            await this.auditLogService.record(orgId, actorUserId, 'team.updated', {
                entityType: 'team', entityId: team.id, details: changedFields,
            });
        }

        return this.getTeamById(orgId, teamId);
    }

    async deleteTeam(orgId, teamId, actorUserId = null) {
        const { PortalUser } = this.models;
        const team = await this.getTeamById(orgId, teamId);
        await PortalUser.update({ team_id: null }, { where: { org_id: orgId, team_id: teamId } });
        await team.destroy();
        await this.auditLogService.record(orgId, actorUserId, 'team.deleted', {
            entityType: 'team', entityId: teamId, details: { name: team.name },
        });
    }
}

export default TeamService;
