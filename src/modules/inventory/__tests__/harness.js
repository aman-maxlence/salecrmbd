/**
 * In-memory stock store that mimics MySQL row locks (SELECT FOR UPDATE)
 * held until the surrounding transaction finishes.
 */
export function createConcurrentStockHarness() {
    const levels = new Map();
    const lockQueues = new Map();

    const levelKey = (orgId, itemId, warehouseId) => `${orgId}:${itemId}:${warehouseId}`;

    const acquire = (key, transaction) => {
        if (transaction._locks.has(key)) return Promise.resolve();
        const prev = lockQueues.get(key) || Promise.resolve();
        let release;
        const held = new Promise((resolve) => {
            release = resolve;
        });
        lockQueues.set(key, prev.then(() => held));
        return prev.then(() => {
            transaction._locks.set(key, release);
        });
    };

    const sequelize = {
        async transaction(fn) {
            const transaction = {
                LOCK: { UPDATE: 'UPDATE' },
                _locks: new Map(),
            };
            try {
                return await fn(transaction);
            } finally {
                for (const release of transaction._locks.values()) release();
            }
        },
    };

    function wrapLevel(row, key) {
        return {
            get warehouse_id() { return row.warehouse_id; },
            get quantity() { return row.quantity; },
            set quantity(v) { row.quantity = Number(v); },
            get version() { return row.version; },
            set version(v) { row.version = Number(v); },
            async save() {
                levels.set(key, row);
            },
        };
    }

    const StockLevel = {
        sequelize,
        async findOne({ where, lock, transaction }) {
            const key = levelKey(where.org_id, where.item_id, where.warehouse_id);
            if (lock && transaction) {
                await acquire(key, transaction);
            }
            const row = levels.get(key);
            return row ? wrapLevel(row, key) : null;
        },
        async create(attrs) {
            const key = levelKey(attrs.org_id, attrs.item_id, attrs.warehouse_id);
            if (levels.has(key)) {
                const err = new Error('Duplicate');
                err.name = 'SequelizeUniqueConstraintError';
                throw err;
            }
            const row = {
                org_id: attrs.org_id,
                item_id: attrs.item_id,
                warehouse_id: attrs.warehouse_id,
                quantity: Number(attrs.quantity ?? 0),
                version: Number(attrs.version ?? 0),
            };
            levels.set(key, row);
            return wrapLevel(row, key);
        },
        async findAll({ where }) {
            return [...levels.values()]
                .filter((row) => row.org_id === where.org_id && row.item_id === where.item_id)
                .map((row) => wrapLevel(row, levelKey(row.org_id, row.item_id, row.warehouse_id)));
        },
    };

    const models = {
        StockLevel,
        InventoryItem: {
            findOne: async ({ where }) => (where.id ? { id: where.id, sku: 'SKU-1', low_stock_threshold: null } : null),
        },
        Warehouse: {
            findOne: async ({ where }) => (where.id ? { id: where.id, status: 'active' } : null),
        },
        StockAdjustment: {
            create: async (attrs) => attrs,
        },
        InventorySettings: {
            findOne: async () => ({ reorder_alerts_enabled: false }),
        },
        LowStockAlert: {
            findOne: async () => null,
            create: async (row) => row,
        },
    };

    return {
        models,
        getQuantity: (orgId, itemId, warehouseId) => {
            const row = levels.get(levelKey(orgId, itemId, warehouseId));
            return row ? Number(row.quantity) : 0;
        },
    };
}
