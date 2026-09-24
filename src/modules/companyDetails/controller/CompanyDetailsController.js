import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class CompanyDetailsController {
    constructor(companyDetailsService) {
        this.companyDetailsService = companyDetailsService;
    }

    async getDetails(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const details = await this.companyDetailsService.getForOrg(orgId);
            return res.json(ResponseFormatter.success('Company details fetched successfully', details, 200));
        } catch (err) {
            next(err);
        }
    }

    async updateDetails(req, res, next) {
        try {
            const orgId = req.user?.org?.id;
            const actorUserId = req.user?.id ?? req.userId;
            const {
                phone, email, website, companyName, vatId, industry, businessType,
                address, city, state, country, postalCode,
                bankName, bankAddress, bankRoutingNumber, bankAccountHolderName,
                bankAccountNumber, iban, swiftCode, bic,
                isDraft,
            } = req.body;
            const details = await this.companyDetailsService.update(
                orgId,
                {
                    phone, email, website, companyName, vatId, industry, businessType,
                    address, city, state, country, postalCode,
                    bankName, bankAddress, bankRoutingNumber, bankAccountHolderName,
                    bankAccountNumber, iban, swiftCode, bic,
                },
                { isDraft: Boolean(isDraft), actorUserId }
            );
            return res.json(ResponseFormatter.success(
                isDraft ? 'Company details saved as draft' : 'Company details updated successfully',
                details,
                200
            ));
        } catch (err) {
            next(err);
        }
    }
}

export default CompanyDetailsController;
