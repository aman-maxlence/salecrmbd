import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';

class DepartmentService {
    constructor(models) {
        this.models = models;
    }

    async createDepartment(orgId, { name, description, headUserId, territoryId }) {
        const { Department, Territory } = this.models;
        if (!territoryId) {
            throw new AppError('A territory is required to create a department.', 400, ErrorCode.VALIDATION_ERROR);
        }
        const territory = await Territory.findOne({ where: { id: territoryId, org_id: orgId } });
        if (!territory) {
            throw new AppError('Territory not found.', 404, ErrorCode.NOT_FOUND);
        }
        const existing = await Department.findOne({ where: { org_id: orgId, territory_id: territoryId, name } });
        if (existing) {
            throw new AppError(`A department named "${name}" already exists in this territory.`, 409, ErrorCode.CONFLICT);
        }
        return Department.create({
            org_id: orgId,
            territory_id: territoryId,
            name,
            description: description ?? null,
            head_user_id: headUserId ?? null,
            status: 'active',
        });
    }

    async getDepartments(orgId, { territoryId } = {}) {
        const { Department, Territory, Country } = this.models;
        const where = { org_id: orgId };
        if (territoryId) where.territory_id = territoryId;
        return Department.findAll({
            where,
            order: [['name', 'ASC']],
            include: [{ model: Territory, as: 'territory', include: [{ model: Country, as: 'country' }] }],
        });
    }

    async getDepartmentById(orgId, departmentId) {
        const { Department, Territory, Country } = this.models;
        const department = await Department.findOne({
            where: { id: departmentId, org_id: orgId },
            include: [{ model: Territory, as: 'territory', include: [{ model: Country, as: 'country' }] }],
        });
        if (!department) {
            throw new AppError('Department not found.', 404, ErrorCode.NOT_FOUND);
        }
        return department;
    }

    async updateDepartment(orgId, departmentId, { name, description, headUserId, status, territoryId }) {
        const department = await this.getDepartmentById(orgId, departmentId);
        if (territoryId !== undefined && String(territoryId) !== String(department.territory_id)) {
            const { Territory } = this.models;
            const territory = await Territory.findOne({ where: { id: territoryId, org_id: orgId } });
            if (!territory) {
                throw new AppError('Territory not found.', 404, ErrorCode.NOT_FOUND);
            }
            department.territory_id = territoryId;
        }
        if (name !== undefined) department.name = name;
        if (description !== undefined) department.description = description;
        if (headUserId !== undefined) department.head_user_id = headUserId;
        if (status !== undefined) department.status = status;
        await department.save();
        return department;
    }

    async deleteDepartment(orgId, departmentId) {
        const { Team } = this.models;
        const department = await this.getDepartmentById(orgId, departmentId);

        const inUseCount = await Team.count({ where: { department_id: departmentId, org_id: orgId } });
        if (inUseCount > 0) {
            throw new AppError(
                `This department still has ${inUseCount} team${inUseCount > 1 ? 's' : ''} under it. Reassign or remove them before deleting it.`,
                409,
                ErrorCode.CONFLICT
            );
        }

        await department.destroy();
    }
}

export default DepartmentService;
