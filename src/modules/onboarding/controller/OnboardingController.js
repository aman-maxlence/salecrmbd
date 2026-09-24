import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class OnboardingController {
    constructor(onboardingService) {
        this.onboardingService = onboardingService;
    }

    _ctx(req) {
        return { orgId: req.user?.org?.id, userId: req.user?.id ?? req.userId };
    }

    /**
     * Onboarding Progress checklist: "track failed steps". Only persists a
     * failure for a genuine/unexpected error (no statusCode, or 5xx) - a
     * normal 400/403/409 (bad input, missing permission, out-of-order step)
     * is expected user-facing feedback, not a system failure worth tracking.
     */
    async _trackFailure(orgId, userId, step, err) {
        if (!orgId || !userId) return;
        if (typeof err?.statusCode === 'number' && err.statusCode < 500) return;
        await this.onboardingService.recordFailure(orgId, userId, step, err?.message);
    }

    /** Analytics checklist #7 "track validation errors" - specifically the 400s (bad input), not permission/conflict rejections. */
    async _trackValidationError(orgId, userId, step, err) {
        if (!orgId || !userId || err?.statusCode !== 400) return;
        await this.onboardingService.trackValidationError(orgId, userId, step, err?.message);
    }

    async getState(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            const state = await this.onboardingService.getStateForClient(orgId, userId);
            return res.json(ResponseFormatter.success('Onboarding state fetched successfully', state, 200));
        } catch (err) {
            next(err);
        }
    }

    async saveWelcome(req, res, next) {
        const { orgId, userId } = this._ctx(req);
        try {
            const state = await this.onboardingService.saveWelcomeStep(orgId, userId, req.body);
            return res.json(ResponseFormatter.success('Welcome step saved successfully', state, 200));
        } catch (err) {
            await this._trackFailure(orgId, userId, 'welcome', err);
            await this._trackValidationError(orgId, userId, 'welcome', err);
            next(err);
        }
    }

    async saveProfile(req, res, next) {
        const { orgId, userId } = this._ctx(req);
        try {
            const state = await this.onboardingService.saveProfileStep(orgId, userId, req.body);
            return res.json(ResponseFormatter.success('Profile saved successfully', state, 200));
        } catch (err) {
            await this._trackFailure(orgId, userId, 'about_you', err);
            await this._trackValidationError(orgId, userId, 'about_you', err);
            next(err);
        }
    }

    async saveCompany(req, res, next) {
        const { orgId, userId } = this._ctx(req);
        try {
            const state = await this.onboardingService.saveCompanyStep(orgId, userId, req.body);
            return res.json(ResponseFormatter.success('Company details saved successfully', state, 200));
        } catch (err) {
            await this._trackFailure(orgId, userId, 'about_company', err);
            await this._trackValidationError(orgId, userId, 'about_company', err);
            next(err);
        }
    }

    async saveInvites(req, res, next) {
        const { orgId, userId } = this._ctx(req);
        try {
            const result = await this.onboardingService.saveInvitesStep(orgId, userId, req.body.invites ?? []);
            return res.json(ResponseFormatter.success('Invites sent successfully', result, 200));
        } catch (err) {
            await this._trackFailure(orgId, userId, 'team_invite', err);
            await this._trackValidationError(orgId, userId, 'team_invite', err);
            next(err);
        }
    }

    async saveImport(req, res, next) {
        const { orgId, userId } = this._ctx(req);
        try {
            const state = await this.onboardingService.saveImportStep(orgId, userId, req.body);
            return res.json(ResponseFormatter.success('Import staged successfully', state, 200));
        } catch (err) {
            await this._trackFailure(orgId, userId, 'data_import', err);
            await this._trackValidationError(orgId, userId, 'data_import', err);
            next(err);
        }
    }

    async savePreferences(req, res, next) {
        const { orgId, userId } = this._ctx(req);
        try {
            const state = await this.onboardingService.savePreferencesStep(orgId, userId, req.body);
            return res.json(ResponseFormatter.success('Preferences saved successfully', state, 200));
        } catch (err) {
            await this._trackFailure(orgId, userId, 'pipeline_preference', err);
            await this._trackValidationError(orgId, userId, 'pipeline_preference', err);
            next(err);
        }
    }

    async trackScreenViewed(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            await this.onboardingService.trackScreenViewed(orgId, userId, req.body?.step);
            return res.json(ResponseFormatter.success('Tracked', null, 200));
        } catch (err) {
            next(err);
        }
    }

    async trackResumed(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            await this.onboardingService.trackResumed(orgId, userId, req.body?.step);
            return res.json(ResponseFormatter.success('Tracked', null, 200));
        } catch (err) {
            next(err);
        }
    }

    async acknowledgeCrmBasics(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            const state = await this.onboardingService.acknowledgeCrmBasicsStep(orgId, userId);
            return res.json(ResponseFormatter.success('CRM basics acknowledged', state, 200));
        } catch (err) {
            next(err);
        }
    }

    async acknowledgeIntegrations(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            const state = await this.onboardingService.acknowledgeIntegrationsStep(orgId, userId);
            return res.json(ResponseFormatter.success('Integrations step acknowledged', state, 200));
        } catch (err) {
            next(err);
        }
    }

    async getReview(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            const summary = await this.onboardingService.getReviewSummary(orgId, userId);
            return res.json(ResponseFormatter.success('Review summary fetched successfully', summary, 200));
        } catch (err) {
            next(err);
        }
    }

    async confirmReview(req, res, next) {
        const { orgId, userId } = this._ctx(req);
        try {
            const state = await this.onboardingService.acknowledgeReviewStep(orgId, userId);
            return res.json(ResponseFormatter.success('Review confirmed', state, 200));
        } catch (err) {
            await this._trackFailure(orgId, userId, 'review', err);
            next(err);
        }
    }

    async skip(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            const state = await this.onboardingService.skipStep(orgId, userId, req.body.step);
            return res.json(ResponseFormatter.success('Step skipped successfully', state, 200));
        } catch (err) {
            next(err);
        }
    }

    async complete(req, res, next) {
        const { orgId, userId } = this._ctx(req);
        try {
            const state = await this.onboardingService.complete(orgId, userId);
            return res.json(ResponseFormatter.success('Onboarding completed successfully', state, 200));
        } catch (err) {
            await this._trackFailure(orgId, userId, 'processing', err);
            next(err);
        }
    }
}

export default OnboardingController;
