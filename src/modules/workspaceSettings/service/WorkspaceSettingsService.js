import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { START_PAGES, THEME_PALETTES } from '../models/WorkspaceSettings.js';

class WorkspaceSettingsService {
    constructor(models) {
        this.models = models;
    }

    /** Idempotent - creates the row with defaults on first read. */
    async getOrCreate(orgId) {
        const { WorkspaceSettings } = this.models;
        const [settings] = await WorkspaceSettings.findOrCreate({
            where: { org_id: orgId },
            defaults: { org_id: orgId },
        });
        return settings;
    }

    async update(orgId, { logoUrl, companyName, location, defaultStartPage, fontPreference, themePalette }) {
        const settings = await this.getOrCreate(orgId);

        if (logoUrl !== undefined) settings.logo_url = logoUrl;
        if (companyName !== undefined) settings.company_name = companyName;
        if (location !== undefined) settings.location = location;

        if (defaultStartPage !== undefined) {
            if (!START_PAGES.includes(defaultStartPage)) {
                throw new AppError(`Invalid start page. Must be one of: ${START_PAGES.join(', ')}`, 400, ErrorCode.VALIDATION_ERROR);
            }
            settings.default_start_page = defaultStartPage;
        }

        if (fontPreference !== undefined) settings.font_preference = fontPreference;

        if (themePalette !== undefined) {
            if (!THEME_PALETTES.includes(themePalette)) {
                throw new AppError(`Invalid theme palette. Must be one of: ${THEME_PALETTES.join(', ')}`, 400, ErrorCode.VALIDATION_ERROR);
            }
            settings.theme_palette = themePalette;
        }

        await settings.save();
        return settings;
    }
}

export default WorkspaceSettingsService;
