import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class CountryController {
    constructor(countryService) {
        this.countryService = countryService;
    }

    async createCountry(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const { name, code } = req.body;
            const country = await this.countryService.createCountry(orgId, { name, code });
            return res.json(ResponseFormatter.success('Country added successfully', country, 201));
        } catch (err) {
            next(err);
        }
    }

    async listCountries(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const countries = await this.countryService.getCountries(orgId);
            return res.json(ResponseFormatter.success('Countries fetched successfully', countries, 200));
        } catch (err) {
            next(err);
        }
    }

    async getCountry(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const country = await this.countryService.getCountryById(orgId, req.params.id);
            return res.json(ResponseFormatter.success('Country fetched successfully', country, 200));
        } catch (err) {
            next(err);
        }
    }

    async updateCountry(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const { status } = req.body;
            const country = await this.countryService.updateCountry(orgId, req.params.id, { status });
            return res.json(ResponseFormatter.success('Country updated successfully', country, 200));
        } catch (err) {
            next(err);
        }
    }

    async deleteCountry(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            await this.countryService.deleteCountry(orgId, req.params.id);
            return res.json(ResponseFormatter.success('Country removed successfully', null, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default CountryController;
