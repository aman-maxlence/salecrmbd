import { Logger } from '../../../utils/index.js';
import { toNumber } from '../../../constants/inventory.js';

class LowStockAlertService {
    constructor(models) {
        this.models = models;
    }

    async listOpen(orgId) {
        const { LowStockAlert, InventoryItem, Warehouse } = this.models;
        return LowStockAlert.findAll({
            where: { org_id: orgId, status: 'open' },
            include: [
                { model: InventoryItem, as: 'item', required: false },
                { model: Warehouse, as: 'warehouse', required: false },
            ],
            order: [['updated_at', 'DESC']],
        });
    }

    async refreshForItem(orgId, itemId) {
        const { InventoryItem, InventorySettings, StockLevel } = this.models;
        const settings = await InventorySettings.findOne({ where: { org_id: orgId } });
        if (!settings || !settings.reorder_alerts_enabled) return [];

        const item = await InventoryItem.findOne({ where: { id: itemId, org_id: orgId } });
        if (!item) return [];

        const threshold = item.low_stock_threshold != null
            ? toNumber(item.low_stock_threshold)
            : toNumber(settings.low_stock_threshold);

        const levels = await StockLevel.findAll({ where: { org_id: orgId, item_id: itemId } });
        const results = [];
        for (const level of levels) {
            results.push(await this._upsertLevelAlert(orgId, item, level, threshold));
        }
        return results.filter(Boolean);
    }

    /**
     * Periodic job: scan every org with alerts enabled and open/resolve rows.
     */
    async runNotificationJob() {
        const { InventorySettings, InventoryItem, StockLevel } = this.models;
        const settingsRows = await InventorySettings.findAll({ where: { reorder_alerts_enabled: true } });
        let opened = 0;

        for (const settings of settingsRows) {
            const orgId = settings.org_id;
            const items = await InventoryItem.findAll({ where: { org_id: orgId, status: 'active' } });
            for (const item of items) {
                const threshold = item.low_stock_threshold != null
                    ? toNumber(item.low_stock_threshold)
                    : toNumber(settings.low_stock_threshold);
                const levels = await StockLevel.findAll({ where: { org_id: orgId, item_id: item.id } });
                for (const level of levels) {
                    const alert = await this._upsertLevelAlert(orgId, item, level, threshold);
                    if (alert?.status === 'open' && !alert.notified_at) {
                        alert.notified_at = new Date();
                        await alert.save();
                        opened += 1;
                        Logger.info(`[LowStock] org=${orgId} item=${item.sku} warehouse=${level.warehouse_id} qty=${level.quantity} threshold=${threshold}`);
                    }
                }
            }
        }

        return { orgs: settingsRows.length, newlyNotified: opened };
    }

    async _upsertLevelAlert(orgId, item, level, threshold) {
        const { LowStockAlert } = this.models;
        const qty = toNumber(level.quantity);
        const open = await LowStockAlert.findOne({
            where: {
                org_id: orgId,
                item_id: item.id,
                warehouse_id: level.warehouse_id,
                status: 'open',
            },
        });

        if (qty <= threshold) {
            if (open) {
                open.quantity = qty;
                open.threshold = threshold;
                await open.save();
                return open;
            }
            return LowStockAlert.create({
                org_id: orgId,
                item_id: item.id,
                warehouse_id: level.warehouse_id,
                threshold,
                quantity: qty,
                status: 'open',
                notified_at: null,
            });
        }

        if (open) {
            open.status = 'resolved';
            open.quantity = qty;
            await open.save();
            return open;
        }
        return null;
    }
}

export default LowStockAlertService;
