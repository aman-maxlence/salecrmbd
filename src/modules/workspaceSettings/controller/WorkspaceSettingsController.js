import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class WorkspaceSettingsController {
    constructor(workspaceSettingsService) {
        this.workspaceSettingsService = workspaceSettingsService;
    }

    async getSettings(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const settings = await this.workspaceSettingsService.getForOrg(orgId);
            return res.json(ResponseFormatter.success('Workspace settings fetched successfully', settings, 200));
        } catch (err) {
            next(err);
        }
    }

    /** POST /org/:orgId/workspace-settings/logo/presigned-url - browser uploads the file directly to S3 with this. */
    async getLogoPresignedUrl(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const { filename, contentType } = req.body;
            const presignedData = await this.workspaceSettingsService.getLogoPresignedUrl(orgId, filename, contentType);
            return res.json(ResponseFormatter.success('Presigned upload URL generated successfully', presignedData, 200));
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
