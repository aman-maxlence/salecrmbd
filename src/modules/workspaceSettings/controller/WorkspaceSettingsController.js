import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class WorkspaceSettingsController {
    constructor(workspaceSettingsService) {
        this.workspaceSettingsService = workspaceSettingsService;
    }

    async getSettings(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const settings = await this.workspaceSettingsService.getOrCreate(orgId);
            return res.json(ResponseFormatter.success('Workspace settings fetched successfully', settings, 200));
        } catch (err) {
            next(err);
        }
    }

    async updateSettings(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const { logoUrl, companyName, location, defaultStartPage, fontPreference, themePalette } = req.body;
            const settings = await this.workspaceSettingsService.update(orgId, {
                logoUrl, companyName, location, defaultStartPage, fontPreference, themePalette,
            });
            return res.json(ResponseFormatter.success('Workspace settings updated successfully', settings, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default WorkspaceSettingsController;
