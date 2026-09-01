import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class DepartmentController {
    constructor(departmentService) {
        this.departmentService = departmentService;
    }

    async createDepartment(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const { name, description, headUserId } = req.body;
            const department = await this.departmentService.createDepartment(orgId, { name, description, headUserId });
            return res.json(ResponseFormatter.success('Department created successfully', department, 201));
        } catch (err) {
            next(err);
        }
    }

    async listDepartments(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const departments = await this.departmentService.getDepartments(orgId);
            return res.json(ResponseFormatter.success('Departments fetched successfully', departments, 200));
        } catch (err) {
            next(err);
        }
    }

    async getDepartment(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const department = await this.departmentService.getDepartmentById(orgId, req.params.id);
            return res.json(ResponseFormatter.success('Department fetched successfully', department, 200));
        } catch (err) {
            next(err);
        }
    }

    async updateDepartment(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const { name, description, headUserId, status } = req.body;
            const department = await this.departmentService.updateDepartment(orgId, req.params.id, { name, description, headUserId, status });
            return res.json(ResponseFormatter.success('Department updated successfully', department, 200));
        } catch (err) {
            next(err);
        }
    }

    async deleteDepartment(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            await this.departmentService.deleteDepartment(orgId, req.params.id);
            return res.json(ResponseFormatter.success('Department deleted successfully', null, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default DepartmentController;
