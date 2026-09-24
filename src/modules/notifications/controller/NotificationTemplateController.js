import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class NotificationTemplateController {
    constructor(templateService) {
        this.templateService = templateService;
    }

    async list(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const rows = await this.templateService.listForOrg(orgId);
            return res.json(ResponseFormatter.success('Notification templates fetched successfully', rows, 200));
        } catch (err) {
            next(err);
        }
    }

    async upsert(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const { subject, heading, bodyText } = req.body;
            const row = await this.templateService.upsert(orgId, req.params.type, { subject, heading, bodyText });
            return res.json(ResponseFormatter.success('Notification template saved successfully', row, 200));
        } catch (err) {
            next(err);
        }
    }

    async reset(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            await this.templateService.reset(orgId, req.params.type);
            return res.json(ResponseFormatter.success('Notification template reset to default', null, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default NotificationTemplateController;
