import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class AnalyticsController {
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }

    async getOnboardingSummary(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const summary = await this.analyticsService.getOnboardingSummary(orgId);
            return res.json(ResponseFormatter.success('Onboarding analytics fetched successfully', summary, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default AnalyticsController;
