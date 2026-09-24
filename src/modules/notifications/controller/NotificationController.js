import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class NotificationController {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }

    async listLog(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const rows = await this.notificationService.listForOrg(orgId, { limit: 200 });
            return res.json(ResponseFormatter.success('Notification log fetched successfully', rows, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default NotificationController;
