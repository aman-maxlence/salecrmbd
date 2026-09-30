import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { toNumber } from '../../../constants/inventory.js';

const BILL_NUMBER_PREFIX = 'BILL-';

class BillService {
    constructor(models) {
        this.models = models;
    }

    async list(orgId, { status, vendorId } = {}) {
        const { Bill, Vendor, PurchaseOrder } = this.models;
        const where = { org_id: orgId };
        if (status) where.status = status;
        if (vendorId) where.vendor_id = vendorId;
        return Bill.findAll({
            where,
            include: [
                { model: Vendor, as: 'vendor', required: false },
                { model: PurchaseOrder, as: 'purchaseOrder', required: false },
            ],
            order: [['created_at', 'DESC']],
        });
    }

    async getById(orgId, id) {
        return this._find(orgId, id);
    }

    /**
     * Called from PurchaseOrderService.receive() right after a PO's lines
     * are updated - never exposed as its own route. One Bill per PO: the
     * first receive creates it, every later partial receive on the same PO
     * just grows its amount instead of spawning a second Bill. Manages its
     * own transaction (rather than joining receive()'s per-line stock
     * adjustments, which each run their own independent transaction inside
     * StockService.adjust) so the bill_number counter lock and the Bill
     * upsert are still atomic with each other, without pretending to be
     * atomic with stock movements that are already committed by the time
     * this runs.
     */
    async syncForPurchaseOrder(orgId, po, userId) {
        const { Bill } = this.models;
        const amount = (po.lineItems ?? []).reduce(
            (sum, line) => sum + toNumber(line.received_quantity) * toNumber(line.unit_cost),
            0
        );

        const sequelize = Bill.sequelize;
        return sequelize.transaction(async (transaction) => {
            let bill = await Bill.findOne({
                where: { org_id: orgId, purchase_order_id: po.id },
                lock: transaction.LOCK.UPDATE,
                transaction,
            });
            if (!bill) {
                const billNumber = await this._nextBillNumber(orgId, transaction);
                const billDate = new Date();
                const dueDate = new Date(billDate);
                dueDate.setDate(dueDate.getDate() + 30);

                bill = await Bill.create({
                    org_id: orgId,
                    vendor_id: po.vendor_id,
                    purchase_order_id: po.id,
                    bill_number: billNumber,
                    bill_date: billDate,
                    due_date: dueDate,
                    amount,
                    paid_amount: 0,
                    status: 'unpaid',
                    created_by: userId ?? null,
                }, { transaction });
                return bill;
            }

            bill.amount = amount;
            bill.status = this._deriveStatus(amount, toNumber(bill.paid_amount));
            await bill.save({ transaction });
            return bill;
        });
    }

    async recordPayment(orgId, billId, { amount, paidDate, method, notes }, userId) {
        const paymentAmount = toNumber(amount, NaN);
        if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
            throw new AppError('Payment amount must be greater than 0.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const { Bill, BillPayment } = this.models;
        const sequelize = Bill.sequelize;

        return sequelize.transaction(async (transaction) => {
            const bill = await Bill.findOne({
                where: { id: billId, org_id: orgId },
                lock: transaction.LOCK.UPDATE,
                transaction,
            });
            if (!bill) throw new AppError('Bill not found.', 404, ErrorCode.NOT_FOUND);
            if (bill.status === 'void') {
                throw new AppError('This bill has been voided and cannot receive payments.', 409, ErrorCode.CONFLICT);
            }

            const balanceDue = toNumber(bill.amount) - toNumber(bill.paid_amount);
            if (paymentAmount > balanceDue) {
                throw new AppError(`Payment cannot exceed the remaining balance of ${balanceDue}.`, 400, ErrorCode.VALIDATION_ERROR);
            }

            await BillPayment.create({
                org_id: orgId,
                bill_id: bill.id,
                amount: paymentAmount,
                paid_date: paidDate || new Date(),
                method: method?.trim() || null,
                notes: notes?.trim() || null,
                created_by: userId ?? null,
            }, { transaction });

            bill.paid_amount = toNumber(bill.paid_amount) + paymentAmount;
            bill.status = this._deriveStatus(toNumber(bill.amount), bill.paid_amount);
            await bill.save({ transaction });

            return this._find(orgId, bill.id, transaction);
        });
    }

    async update(orgId, id, { dueDate, notes }) {
        const bill = await this._find(orgId, id);
        if (dueDate !== undefined) bill.due_date = dueDate || null;
        if (notes !== undefined) bill.notes = notes?.trim() || null;
        await bill.save();
        return bill;
    }

    async void(orgId, id) {
        const bill = await this._find(orgId, id);
        if (toNumber(bill.paid_amount) > 0) {
            throw new AppError('This bill has payments recorded - reverse them before voiding.', 409, ErrorCode.CONFLICT);
        }
        bill.status = 'void';
        await bill.save();
        return bill;
    }

    _deriveStatus(amount, paidAmount) {
        if (paidAmount <= 0) return 'unpaid';
        if (paidAmount >= amount) return 'paid';
        return 'partially_paid';
    }

    async _nextBillNumber(orgId, transaction) {
        const { BillCounter } = this.models;
        let counter = await BillCounter.findOne({ where: { org_id: orgId }, lock: transaction.LOCK.UPDATE, transaction });
        if (!counter) {
            counter = await BillCounter.create({ org_id: orgId, next_number: 1 }, { transaction });
        }
        const number = counter.next_number;
        counter.next_number += 1;
        await counter.save({ transaction });
        return `${BILL_NUMBER_PREFIX}${String(number).padStart(5, '0')}`;
    }

    async _find(orgId, id, transaction) {
        const { Bill, Vendor, PurchaseOrder, BillPayment } = this.models;
        const bill = await Bill.findOne({
            where: { id, org_id: orgId },
            include: [
                { model: Vendor, as: 'vendor', required: false },
                { model: PurchaseOrder, as: 'purchaseOrder', required: false },
                { model: BillPayment, as: 'payments', required: false },
            ],
            transaction,
        });
        if (!bill) throw new AppError('Bill not found.', 404, ErrorCode.NOT_FOUND);
        if (bill.payments) bill.payments.sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date));
        return bill;
    }
}

export default BillService;
