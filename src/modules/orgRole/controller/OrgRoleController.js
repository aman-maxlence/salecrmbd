import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class OrgRoleController {
    constructor(orgRoleService) {
        this.orgRoleService = orgRoleService;
    }

    async createRole(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const changedBy = req.user?.id ?? req.userId;
            const { roleName, description } = req.body;
            const role = await this.orgRoleService.createRole(orgId, { roleName, description }, changedBy);
            return res.json(ResponseFormatter.success('Role created successfully', role, 201));
        } catch (err) {
            next(err);
        }
    }

    async listRoles(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const roles = await this.orgRoleService.getRoles(orgId);
            return res.json(ResponseFormatter.success('Roles fetched successfully', roles, 200));
        } catch (err) {
            next(err);
        }
    }

    async getRole(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const role = await this.orgRoleService.getRoleById(orgId, req.params.id);
            return res.json(ResponseFormatter.success('Role fetched successfully', role, 200));
        } catch (err) {
            next(err);
        }
    }

    async updateRole(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const changedBy = req.user?.id ?? req.userId;
            const { roleName, description, status } = req.body;
            const role = await this.orgRoleService.updateRole(orgId, req.params.id, { roleName, description, status }, changedBy);
            return res.json(ResponseFormatter.success('Role updated successfully', role, 200));
        } catch (err) {
            next(err);
        }
    }

    async updatePermissions(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const changedBy = req.user?.id ?? req.userId;
            const role = await this.orgRoleService.updatePermissions(orgId, req.params.id, req.body.permissions ?? {}, changedBy);
            return res.json(ResponseFormatter.success('Permissions updated successfully', role, 200));
        } catch (err) {
            next(err);
        }
    }

    async deleteRole(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const changedBy = req.user?.id ?? req.userId;
            await this.orgRoleService.deleteRole(orgId, req.params.id, changedBy);
            return res.json(ResponseFormatter.success('Role deleted successfully', null, 200));
        } catch (err) {
            next(err);
        }
    }

    async getAuditLog(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const log = await this.orgRoleService.getAuditLog(orgId, req.params.id);
            return res.json(ResponseFormatter.success('Audit log fetched successfully', log, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default OrgRoleController;
