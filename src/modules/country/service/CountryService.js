import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';

class CountryService {
    constructor(models) {
        this.models = models;
    }

    async createCountry(orgId, { name, code }) {
        const { Country } = this.models;
        const existing = await Country.findOne({ where: { org_id: orgId, code } });
        if (existing) {
            throw new AppError(`"${name}" is already added to this org.`, 409, ErrorCode.CONFLICT);
        }
        return Country.create({ org_id: orgId, name, code, status: 'active' });
    }

    async getCountries(orgId) {
        const { Country } = this.models;
        return Country.findAll({ where: { org_id: orgId }, order: [['name', 'ASC']] });
    }

    async getCountryById(orgId, countryId) {
        const { Country } = this.models;
        const country = await Country.findOne({ where: { id: countryId, org_id: orgId } });
        if (!country) {
            throw new AppError('Country not found.', 404, ErrorCode.NOT_FOUND);
        }
        return country;
    }

    async updateCountry(orgId, countryId, { status }) {
        const country = await this.getCountryById(orgId, countryId);
        if (status !== undefined) country.status = status;
        await country.save();
        return country;
    }

    async deleteCountry(orgId, countryId) {
        const { Territory } = this.models;
        const country = await this.getCountryById(orgId, countryId);

        const inUseCount = await Territory.count({ where: { country_id: countryId, org_id: orgId } });
        if (inUseCount > 0) {
            throw new AppError(
                `This country still has ${inUseCount} territor${inUseCount > 1 ? 'ies' : 'y'} under it. Reassign or remove them before deleting it.`,
                409,
                ErrorCode.CONFLICT
            );
        }

        await country.destroy();
    }
}

export default CountryService;
