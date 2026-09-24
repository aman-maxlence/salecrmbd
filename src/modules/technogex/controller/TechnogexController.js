import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class TechnogexController {
    constructor({ catalogService, syncService, models }) {
        this.catalogService = catalogService;
        this.syncService = syncService;
        this.models = models;
    }

    async searchProducts(req, res, next) {
        try {
            const rows = await this.catalogService.searchProducts(req.query.q);
            return res.json(ResponseFormatter.success('Technogex products fetched', rows, 200));
        } catch (err) {
            next(err);
        }
    }

    async searchDesignItems(req, res, next) {
        try {
            const rows = await this.catalogService.searchDesignItems(req.query.q);
            return res.json(ResponseFormatter.success('Technogex design items fetched', rows, 200));
        } catch (err) {
            next(err);
        }
    }

    async searchValuePacks(req, res, next) {
        try {
            const rows = await this.catalogService.searchValuePacks(req.query.q);
            return res.json(ResponseFormatter.success('Technogex value packs fetched', rows, 200));
        } catch (err) {
            next(err);
        }
    }

    async listSyncRuns(req, res, next) {
        try {
            const { TechnogexSyncRun } = this.models;
            const rows = await TechnogexSyncRun.findAll({ order: [['started_at', 'DESC']], limit: 50 });
            return res.json(ResponseFormatter.success('Sync runs fetched', rows, 200));
        } catch (err) {
            next(err);
        }
    }

    async triggerSync(req, res, next) {
        try {
            const family = req.body?.family || 'all';
            const fullResync = req.body?.fullResync === true;
            const result = await this.syncService.runSync(family, { fullResync });
            return res.json(ResponseFormatter.success('Sync run started', result, 202));
        } catch (err) {
            next(err);
        }
    }
}

export default TechnogexController;
