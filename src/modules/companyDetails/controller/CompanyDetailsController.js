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
            const {
                phone, email, website, companyName, vatId, address, city, state,
                bankName, bankAddress, bankRoutingNumber, bankAccountHolderName,
                bankAccountNumber, iban, swiftCode, bic,
            } = req.body;
            const details = await this.companyDetailsService.update(orgId, {
                phone, email, website, companyName, vatId, address, city, state,
                bankName, bankAddress, bankRoutingNumber, bankAccountHolderName,
                bankAccountNumber, iban, swiftCode, bic,
            });
            return res.json(ResponseFormatter.success('Company details updated successfully', details, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default CompanyDetailsController;
