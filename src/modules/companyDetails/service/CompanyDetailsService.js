import Logger from '../../../utils/Logger.js';

const FIELDS = [
    'phone', 'email', 'website', 'companyName', 'vatId', 'address', 'city', 'state',
    'bankName', 'bankAddress', 'bankRoutingNumber', 'bankAccountHolderName',
    'bankAccountNumber', 'iban', 'swiftCode', 'bic',
];

const COLUMN_BY_FIELD = {
    companyName: 'company_name',
    vatId: 'vat_id',
    bankName: 'bank_name',
    bankAddress: 'bank_address',
    bankRoutingNumber: 'bank_routing_number',
    bankAccountHolderName: 'bank_account_holder_name',
    bankAccountNumber: 'bank_account_number',
    swiftCode: 'swift_code',
};

const columnFor = (field) => COLUMN_BY_FIELD[field] || field;

class CompanyDetailsService {
    constructor(models) {
        this.models = models;
    }

    toApiShape(row, orgId) {
        return FIELDS.reduce(
            (acc, field) => ({ ...acc, [field]: row ? row[columnFor(field)] ?? null : null }),
            { orgId: row ? row.org_id : orgId }
        );
    }

    /** Idempotent - creates the row with defaults on first read. */
    async getOrCreate(orgId) {
        const { CompanyDetails } = this.models;
        const [row] = await CompanyDetails.findOrCreate({
            where: { org_id: orgId },
            defaults: { org_id: orgId },
        });
        return row;
    }

    async getForOrg(orgId) {
        const row = await this.getOrCreate(orgId);
        return this.toApiShape(row, orgId);
    }

    async update(orgId, data) {
        const row = await this.getOrCreate(orgId);

        const updates = {};
        for (const field of FIELDS) {
            if (data[field] !== undefined) updates[columnFor(field)] = data[field];
        }

        await row.update(updates);

        Logger.info(`[CompanyDetailsService] Updated company details for org=${orgId}`);
        return this.toApiShape(row, orgId);
    }
}

export default CompanyDetailsService;
