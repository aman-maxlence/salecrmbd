import Logger from '../../../utils/Logger.js';
import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import AuditLogService from '../../auditLog/service/AuditLogService.js';

const FIELDS = [
    'phone', 'email', 'website', 'companyName', 'vatId', 'industry', 'businessType',
    'address', 'city', 'state', 'country', 'postalCode',
    'bankName', 'bankAddress', 'bankRoutingNumber', 'bankAccountHolderName',
    'bankAccountNumber', 'iban', 'swiftCode', 'bic', 'status',
];

const COLUMN_BY_FIELD = {
    companyName: 'company_name',
    vatId: 'vat_id',
    businessType: 'business_type',
    postalCode: 'postal_code',
    bankName: 'bank_name',
    bankAddress: 'bank_address',
    bankRoutingNumber: 'bank_routing_number',
    bankAccountHolderName: 'bank_account_holder_name',
    bankAccountNumber: 'bank_account_number',
    swiftCode: 'swift_code',
};

const columnFor = (field) => COLUMN_BY_FIELD[field] || field;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+/i;
const PHONE_RE = /^[+]?[()\-\s\d]{7,20}$/;

class CompanyDetailsService {
    constructor(models) {
        this.models = models;
        this.auditLogService = new AuditLogService(models);
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

    /**
     * Required-field check is skipped for a draft save (item #12 of the
     * Business/Account Information checklist - a user can save partial
     * progress). Format checks (email/website/phone) always apply when the
     * field is non-empty, draft or not - "draft" means "incomplete", not
     * "garbage data allowed".
     */
    _validate(data, { isDraft }) {
        if (!isDraft && !String(data.companyName ?? '').trim()) {
            throw new AppError('Company name is required.', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (data.email && !EMAIL_RE.test(data.email)) {
            throw new AppError('Please enter a valid email address.', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (data.website && !URL_RE.test(data.website)) {
            throw new AppError('Please enter a valid website URL (starting with http:// or https://).', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (data.phone && !PHONE_RE.test(data.phone)) {
            throw new AppError('Please enter a valid phone number.', 400, ErrorCode.VALIDATION_ERROR);
        }
    }

    async update(orgId, data, { isDraft = false, actorUserId = null } = {}) {
        this._validate(data, { isDraft });

        const row = await this.getOrCreate(orgId);

        const updates = { status: isDraft ? 'draft' : 'complete' };
        for (const field of FIELDS) {
            if (data[field] !== undefined) updates[columnFor(field)] = data[field];
        }

        await row.update(updates);

        Logger.info(`[CompanyDetailsService] Updated company details for org=${orgId} (status=${updates.status})`);
        // Audit & History checklist #11 - covers both the onboarding About
        // Company step and direct Settings > Company Details edits, since
        // both route through this one method.
        await this.auditLogService.record(orgId, actorUserId, 'company_details.updated', {
            entityType: 'company_details', entityId: row.id, details: { fields: Object.keys(updates), isDraft },
        });
        return this.toApiShape(row, orgId);
    }
}

export default CompanyDetailsService;
