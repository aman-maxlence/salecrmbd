import { Logger } from '../../../utils/index.js';
import { toNumber } from '../../../constants/inventory.js';
import PushService from '../../push/service/PushService.js';

class LowStockAlertService {
    constructor(models) {
        this.models = models;
        this.pushService = new PushService(models);
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
            const alert = await this._upsertLevelAlert(orgId, item, level, threshold);
            if (alert) await this._maybeNotify(orgId, alert, item);
            results.push(alert);
        }
        return results.filter(Boolean);
    }

    /**
     * Periodic job: scan every org with alerts enabled and open/resolve rows.
     * Real-time coverage already comes from refreshForItem (called right
     * after every stock adjustment) - this job exists to catch anything that
     * could only drift out of sync without a stock change happening, e.g. an
     * item's own low_stock_threshold being lowered below its current level.
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
                    if (alert && await this._maybeNotify(orgId, alert, item)) opened += 1;
                }
            }
        }

        return { orgs: settingsRows.length, newlyNotified: opened };
    }

    /**
     * "Low-stock alert/notification APIs" previously only ever wrote a
     * notified_at timestamp and a server log line - nothing was actually
     * sent to anyone. Now pushes to every admin/inventory-manager in the
     * org, the same alert-on-real-event pattern as
     * NotificationService._alertAdminsOfFailure. Best-effort and shared by
     * both the real-time path (refreshForItem) and the periodic sweep, so
     * whichever notices the crossed threshold first wins - notified_at
     * guards against a duplicate push from the other.
     */
    async _maybeNotify(orgId, alert, item) {
        if (alert.status !== 'open' || alert.notified_at) return false;
        alert.notified_at = new Date();
        await alert.save();
        Logger.info(`[LowStock] org=${orgId} item=${item.sku} warehouse=${alert.warehouse_id} qty=${alert.quantity} threshold=${alert.threshold}`);
        await this._alertAdminsOfLowStock(orgId, item, alert).catch(() => {});
        return true;
    }

    /** Best-effort - never throws, never blocks the alert/adjustment this was reporting on. */
    async _alertAdminsOfLowStock(orgId, item, alert) {
        const { PortalUser, OrgRole } = this.models;
        const admins = await PortalUser.findAll({
            where: { org_id: orgId, status: 'active' },
            include: [{ model: OrgRole, as: 'role', where: { org_id: orgId }, required: true }],
        });

        const relevantAdmins = admins.filter((a) =>
            a.role?.is_admin || a.role?.permissions?.manage_inventory === true || a.role?.permissions?.manage_inventory_settings === true
        );

        await Promise.all(relevantAdmins.map((admin) =>
            this.pushService.sendToUser(orgId, admin.user_id, {
                title: 'Low stock alert',
                body: `${item.name} is down to ${toNumber(alert.quantity)} (threshold ${toNumber(alert.threshold)})`,
                url: '/inventory/alerts',
            }).catch(() => {})
        ));
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
