import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { START_PAGES, THEME_PALETTES } from '../models/WorkspaceSettings.js';
import S3UploadService from '../../../utils/S3UploadService.js';

class WorkspaceSettingsService {
    constructor(models) {
        this.models = models;
        this.s3Service = new S3UploadService();
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

    /** Resolves the stored logo (an S3 key, or a legacy pasted URL) into something the frontend can put in an <img src>. */
    async withResolvedLogo(settings) {
        const plain = settings.toJSON ? settings.toJSON() : settings;
        plain.logo_url = await this.s3Service.getSignedDownloadUrl(plain.logo_url);
        return plain;
    }

    async getForOrg(orgId) {
        const settings = await this.getOrCreate(orgId);
        return this.withResolvedLogo(settings);
    }

    async getLogoPresignedUrl(orgId, filename, contentType) {
        if (!filename || !contentType) {
            throw new AppError('filename and contentType are required', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (!contentType.startsWith('image/')) {
            throw new AppError('File must be an image', 400, ErrorCode.VALIDATION_ERROR);
        }
        return this.s3Service.getSignedUploadUrlForWorkspaceLogo(orgId, filename, contentType);
    }

    async update(orgId, { logoUrl, companyName, location, defaultStartPage, fontPreference, themePalette }) {
        const settings = await this.getOrCreate(orgId);

        if (logoUrl !== undefined) {
            const previousKey = settings.logo_url;
            settings.logo_url = logoUrl;
            if (previousKey && previousKey !== logoUrl) {
                this.s3Service.deleteFile(previousKey).catch(() => {});
            }
        }
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
        return this.withResolvedLogo(settings);
    }
}

export default WorkspaceSettingsService;
