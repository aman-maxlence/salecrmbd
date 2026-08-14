import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class SalesRepController {
    constructor(salesRepService) {
        this.salesRepService = salesRepService;
    }

    /**
     * GET /api/sales-reps - list active reps in the org, for assigning
     * deals to (owner picker in the UI).
     */
    async listReps(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const data = await this.salesRepService.listByOrg(orgId);
            return res.json(ResponseFormatter.success('Sales reps fetched successfully', data, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default SalesRepController;
