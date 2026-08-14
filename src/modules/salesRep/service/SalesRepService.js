import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';

class SalesRepService {
    constructor(models) {
        this.models = models;
    }

    /**
     * findOrCreate a SalesRep row for (userId, orgId). Called from the
     * webhook handlers - never from request-time code, so a missing row
     * means the sync genuinely hasn't happened yet (see _getSalesRepId).
     */
    async createOrGet(userId, orgId, { role = 'member', transaction } = {}) {
        const { SalesRep } = this.models;
        const [rep] = await SalesRep.findOrCreate({
            where: { user_id: userId, org_id: orgId },
            defaults: { user_id: userId, org_id: orgId, role, status: 'active' },
            ...(transaction && { transaction }),
        });
        return rep;
    }

    createOrGetAdmin(userId, orgId, transaction) {
        return this.createOrGet(userId, orgId, { role: 'admin', transaction });
    }

    createOrGetMember(userId, orgId, transaction) {
        return this.createOrGet(userId, orgId, { role: 'member', transaction });
    }

    /**
     * Look up the local SalesRep id for a (userId, orgId) pair. Used by
     * other modules (Deal/Incentive) to translate the raw
     * userbd id on req.user into the local id their foreign keys expect -
     * the same pattern as maxpmbd's BookmarkService._getPortalUserId.
     * Throws if the webhook sync hasn't created the row yet, rather than
     * silently creating one here (request-time code shouldn't guess at role).
     */
    async getSalesRepId(userId, orgId) {
        const { SalesRep } = this.models;
        const rep = await SalesRep.findOne({ where: { user_id: userId, org_id: orgId } });
        if (!rep) {
            throw new AppError(
                'Your account has not finished syncing to Sale CRM yet. Please try again shortly.',
                404,
                ErrorCode.NOT_FOUND
            );
        }
        return rep.id;
    }

    async listByOrg(orgId) {
        const { SalesRep } = this.models;
        return SalesRep.findAll({ where: { org_id: orgId, status: 'active' }, order: [['created_at', 'ASC']] });
    }
}

export default SalesRepService;
