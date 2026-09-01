import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';

class DepartmentService {
    constructor(models) {
        this.models = models;
    }

    async createDepartment(orgId, { name, description, headUserId }) {
        const { Department } = this.models;
        const existing = await Department.findOne({ where: { org_id: orgId, name } });
        if (existing) {
            throw new AppError(`A department named "${name}" already exists in this org.`, 409, ErrorCode.CONFLICT);
        }
        return Department.create({
            org_id: orgId,
            name,
            description: description ?? null,
            head_user_id: headUserId ?? null,
            status: 'active',
        });
    }

    async getDepartments(orgId) {
        const { Department } = this.models;
        return Department.findAll({ where: { org_id: orgId }, order: [['name', 'ASC']] });
    }

    async getDepartmentById(orgId, departmentId) {
        const { Department } = this.models;
        const department = await Department.findOne({ where: { id: departmentId, org_id: orgId } });
        if (!department) {
            throw new AppError('Department not found.', 404, ErrorCode.NOT_FOUND);
        }
        return department;
    }

    async updateDepartment(orgId, departmentId, { name, description, headUserId, status }) {
        const department = await this.getDepartmentById(orgId, departmentId);
        if (name !== undefined) department.name = name;
        if (description !== undefined) department.description = description;
        if (headUserId !== undefined) department.head_user_id = headUserId;
        if (status !== undefined) department.status = status;
        await department.save();
        return department;
    }

    async deleteDepartment(orgId, departmentId) {
        const department = await this.getDepartmentById(orgId, departmentId);
        await department.destroy();
    }
}

export default DepartmentService;
