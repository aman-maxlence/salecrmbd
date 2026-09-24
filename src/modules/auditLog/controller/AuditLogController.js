import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class AuditLogController {
    constructor(auditLogService) {
        this.auditLogService = auditLogService;
    }

    async list(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const { action } = req.query;
            const rows = await this.auditLogService.listForOrgWithActors(orgId, { action, limit: 200 });
            return res.json(ResponseFormatter.success('Audit history fetched successfully', rows, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default AuditLogController;
