import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { toNumber } from '../../../constants/inventory.js';
import { PACKAGE_STATUSES } from '../models/Package.js';

class PackageService {
    constructor(models) {
        this.models = models;
    }

    async list(orgId, { salesOrderId } = {}) {
        const { Package, SalesOrder } = this.models;
        const where = { org_id: orgId };
        if (salesOrderId) where.sales_order_id = salesOrderId;
        return Package.findAll({
            where,
            include: [{ model: SalesOrder, as: 'salesOrder', required: false }],
            order: [['created_at', 'DESC']],
        });
    }

    async getById(orgId, id) {
        return this._find(orgId, id);
    }

    /**
     * `lines` reference SalesOrderLineItem ids + a quantity being packed -
     * validated against that line's `fulfilled_quantity` (you can only pack
     * what's already been shipped out of stock via SO fulfillment).
     */
    async create(orgId, { salesOrderId, carrier, trackingNumber, lines }, createdBy) {
        const { Package, PackageLineItem, SalesOrder, SalesOrderLineItem } = this.models;

        if (!salesOrderId) throw new AppError('Sales order is required.', 400, ErrorCode.VALIDATION_ERROR);
        if (!Array.isArray(lines) || lines.length === 0) {
            throw new AppError('At least one line item is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const salesOrder = await SalesOrder.findOne({ where: { id: salesOrderId, org_id: orgId } });
        if (!salesOrder) throw new AppError('Sales order not found.', 404, ErrorCode.NOT_FOUND);

        const normalizedLines = [];
        for (const line of lines) {
            const quantity = toNumber(line.quantity, NaN);
            if (!line.salesOrderLineItemId || !Number.isFinite(quantity) || quantity <= 0) {
                throw new AppError('Each line needs a Sales Order line and a quantity greater than 0.', 400, ErrorCode.VALIDATION_ERROR);
            }
            const soLine = await SalesOrderLineItem.findOne({
                where: { id: line.salesOrderLineItemId, org_id: orgId, sales_order_id: salesOrderId },
            });
            if (!soLine) throw new AppError('Sales order line not found.', 404, ErrorCode.NOT_FOUND);
            if (quantity > toNumber(soLine.fulfilled_quantity)) {
                throw new AppError(
                    `Cannot pack more than the fulfilled quantity (${soLine.fulfilled_quantity}) for this line.`,
                    400,
                    ErrorCode.VALIDATION_ERROR
                );
            }
            normalizedLines.push({ sales_order_line_item_id: soLine.id, quantity });
        }

        const sequelize = Package.sequelize;
        const pkg = await sequelize.transaction(async (transaction) => {
            const created = await Package.create({
                org_id: orgId,
                sales_order_id: salesOrderId,
                carrier: carrier?.trim() || null,
                tracking_number: trackingNumber?.trim() || null,
                status: 'packed',
                created_by: createdBy ?? null,
            }, { transaction });

            await PackageLineItem.bulkCreate(
                normalizedLines.map((line) => ({ org_id: orgId, package_id: created.id, ...line })),
                { transaction }
            );

            return created;
        });

        return this.getById(orgId, pkg.id);
    }

    async updateStatus(orgId, id, status) {
        if (!PACKAGE_STATUSES.includes(status)) {
            throw new AppError(`Status must be one of: ${PACKAGE_STATUSES.join(', ')}`, 400, ErrorCode.VALIDATION_ERROR);
        }
        const pkg = await this._find(orgId, id);
        pkg.status = status;
        if (status === 'shipped' && !pkg.shipped_date) {
            pkg.shipped_date = new Date().toISOString().slice(0, 10);
        }
        await pkg.save();
        return pkg;
    }

    async _find(orgId, id) {
        const { Package, PackageLineItem, SalesOrder, SalesOrderLineItem, InventoryItem } = this.models;
        const pkg = await Package.findOne({
            where: { id, org_id: orgId },
            include: [
                { model: SalesOrder, as: 'salesOrder', required: false },
                {
                    model: PackageLineItem,
                    as: 'lineItems',
                    required: false,
                    include: [{
                        model: SalesOrderLineItem,
                        as: 'salesOrderLineItem',
                        required: false,
                        include: [{ model: InventoryItem, as: 'item', required: false }],
                    }],
                },
            ],
        });
        if (!pkg) throw new AppError('Package not found.', 404, ErrorCode.NOT_FOUND);
        return pkg;
    }
}

export default PackageService;
