import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import NotificationService from '../../notifications/service/NotificationService.js';

class TerritoryService {
    constructor(models) {
        this.models = models;
        this.notificationService = new NotificationService(models);
    }

    async createTerritory(orgId, { name, managerUserId, countryId }) {
        const { Territory, Country } = this.models;
        const existing = await Territory.findOne({ where: { org_id: orgId, name } });
        if (existing) {
            throw new AppError(`A territory named "${name}" already exists in this org.`, 409, ErrorCode.CONFLICT);
        }
        if (countryId) {
            const country = await Country.findOne({ where: { id: countryId, org_id: orgId } });
            if (!country) {
                throw new AppError('Country not found.', 404, ErrorCode.NOT_FOUND);
            }
        }
        return Territory.create({ org_id: orgId, name, manager_user_id: managerUserId ?? null, country_id: countryId ?? null, status: 'active' });
    }

    async getTerritories(orgId) {
        const { Territory, Country } = this.models;
        return Territory.findAll({ where: { org_id: orgId }, order: [['name', 'ASC']], include: [{ model: Country, as: 'country' }] });
    }

    async getTerritoryById(orgId, territoryId) {
        const { Territory, Country } = this.models;
        const territory = await Territory.findOne({ where: { id: territoryId, org_id: orgId }, include: [{ model: Country, as: 'country' }] });
        if (!territory) {
            throw new AppError('Territory not found.', 404, ErrorCode.NOT_FOUND);
        }
        return territory;
    }

    async updateTerritory(orgId, territoryId, { name, managerUserId, status, countryId }) {
        const territory = await this.getTerritoryById(orgId, territoryId);
        if (countryId !== undefined) {
            if (countryId) {
                const { Country } = this.models;
                const country = await Country.findOne({ where: { id: countryId, org_id: orgId } });
                if (!country) {
                    throw new AppError('Country not found.', 404, ErrorCode.NOT_FOUND);
                }
            }
            territory.country_id = countryId;
        }
        if (name !== undefined) territory.name = name;
        if (managerUserId !== undefined) territory.manager_user_id = managerUserId;
        if (status !== undefined) territory.status = status;

        const changedFields = territory.changed() || [];
        const changeSummary = this._describeChanges(changedFields);
        await territory.save();

        if (changeSummary) {
            await this._notifyTerritoryMembers(orgId, territory, changeSummary);
        }
        return territory;
    }

    _describeChanges(changedFields) {
        const labels = { name: 'name', manager_user_id: 'manager', status: 'status', country_id: 'country' };
        const relevant = changedFields.filter((f) => labels[f]);
        if (relevant.length === 0) return null;
        return `its ${relevant.map((f) => labels[f]).join(', ')} changed`;
    }

    /** Best-effort - a notification failure must never fail the territory update itself. */
    async _notifyTerritoryMembers(orgId, territory, summary) {
        try {
            const { PortalUser } = this.models;
            const members = await PortalUser.findAll({ where: { org_id: orgId, territory_id: territory.id } });
            await Promise.all(members.map((member) =>
                this.notificationService.sendTerritoryUpdateEmail(orgId, member.user_id, {
                    territoryId: territory.id,
                    territoryName: territory.name,
                    summary,
                }).catch(() => {})
            ));
        } catch {
            // Best-effort - swallow so a notification failure never fails the territory update.
        }
    }

    async deleteTerritory(orgId, territoryId) {
        const { PortalUser, Department } = this.models;
        const territory = await this.getTerritoryById(orgId, territoryId);

        const inUseCount = await PortalUser.count({ where: { territory_id: territoryId, org_id: orgId } });
        if (inUseCount > 0) {
            throw new AppError(
                `This territory is still assigned to ${inUseCount} user(s). Reassign them before deleting it.`,
                409,
                ErrorCode.CONFLICT
            );
        }

        const departmentCount = await Department.count({ where: { territory_id: territoryId, org_id: orgId } });
        if (departmentCount > 0) {
            throw new AppError(
                `This territory still has ${departmentCount} department${departmentCount > 1 ? 's' : ''} under it. Reassign or remove them before deleting it.`,
                409,
                ErrorCode.CONFLICT
            );
        }

        await territory.destroy();
    }
}

export default TerritoryService;
