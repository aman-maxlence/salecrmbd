import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class OnboardingController {
    constructor(onboardingService) {
        this.onboardingService = onboardingService;
    }

    _ctx(req) {
        return { orgId: req.user?.org?.id, userId: req.user?.id ?? req.userId };
    }

    async getState(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            const state = await this.onboardingService.getState(orgId, userId);
            return res.json(ResponseFormatter.success('Onboarding state fetched successfully', state, 200));
        } catch (err) {
            next(err);
        }
    }

    async saveProfile(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            const state = await this.onboardingService.saveProfileStep(orgId, userId, req.body);
            return res.json(ResponseFormatter.success('Profile saved successfully', state, 200));
        } catch (err) {
            next(err);
        }
    }

    async saveCompany(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            const state = await this.onboardingService.saveCompanyStep(orgId, userId, req.body);
            return res.json(ResponseFormatter.success('Company details saved successfully', state, 200));
        } catch (err) {
            next(err);
        }
    }

    async saveInvites(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            const created = await this.onboardingService.saveInvitesStep(orgId, userId, req.body.invites ?? []);
            return res.json(ResponseFormatter.success('Invites sent successfully', created, 200));
        } catch (err) {
            next(err);
        }
    }

    async saveImport(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            const state = await this.onboardingService.saveImportStep(orgId, userId, req.body);
            return res.json(ResponseFormatter.success('Import staged successfully', state, 200));
        } catch (err) {
            next(err);
        }
    }

    async savePreferences(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            const state = await this.onboardingService.savePreferencesStep(orgId, userId, req.body);
            return res.json(ResponseFormatter.success('Preferences saved successfully', state, 200));
        } catch (err) {
            next(err);
        }
    }

    async complete(req, res, next) {
        try {
            const { orgId, userId } = this._ctx(req);
            const state = await this.onboardingService.complete(orgId, userId);
            return res.json(ResponseFormatter.success('Onboarding completed successfully', state, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default OnboardingController;
