import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';

class TerritoryService {
    constructor(models) {
        this.models = models;
    }

    async createTerritory(orgId, { name, managerUserId }) {
        const { Territory } = this.models;
        const existing = await Territory.findOne({ where: { org_id: orgId, name } });
        if (existing) {
            throw new AppError(`A territory named "${name}" already exists in this org.`, 409, ErrorCode.CONFLICT);
        }
        return Territory.create({ org_id: orgId, name, manager_user_id: managerUserId ?? null, status: 'active' });
    }

    async getTerritories(orgId) {
        const { Territory } = this.models;
        return Territory.findAll({ where: { org_id: orgId }, order: [['name', 'ASC']] });
    }

    async getTerritoryById(orgId, territoryId) {
        const { Territory } = this.models;
        const territory = await Territory.findOne({ where: { id: territoryId, org_id: orgId } });
        if (!territory) {
            throw new AppError('Territory not found.', 404, ErrorCode.NOT_FOUND);
        }
        return territory;
    }

    async updateTerritory(orgId, territoryId, { name, managerUserId, status }) {
        const territory = await this.getTerritoryById(orgId, territoryId);
        if (name !== undefined) territory.name = name;
        if (managerUserId !== undefined) territory.manager_user_id = managerUserId;
        if (status !== undefined) territory.status = status;
        await territory.save();
        return territory;
    }

    async deleteTerritory(orgId, territoryId) {
        const { PortalUser } = this.models;
        const territory = await this.getTerritoryById(orgId, territoryId);

        const inUseCount = await PortalUser.count({ where: { territory_id: territoryId, org_id: orgId } });
        if (inUseCount > 0) {
            throw new AppError(
                `This territory is still assigned to ${inUseCount} user(s). Reassign them before deleting it.`,
                409,
                ErrorCode.CONFLICT
            );
        }

        await territory.destroy();
    }
}

export default TerritoryService;
