import StockService from '../service/StockService.js';
import { createConcurrentStockHarness } from './harness.js';

describe('StockService concurrent updates', () => {
    test('50 concurrent receives land as +50, not lost updates', async () => {
        const { models, getQuantity } = createConcurrentStockHarness();
        const service = new StockService(models);

        await Promise.all(
            Array.from({ length: 50 }, () =>
                service.adjust(1, { type: 'receive', itemId: 10, warehouseId: 1, quantity: 1 }, 99)
            )
        );

        expect(getQuantity(1, 10, 1)).toBe(50);
    });

    test('concurrent issue cannot oversell', async () => {
        const { models, getQuantity } = createConcurrentStockHarness();
        const service = new StockService(models);

        await service.adjust(1, { type: 'receive', itemId: 10, warehouseId: 1, quantity: 20 }, 99);

        const results = await Promise.allSettled(
            Array.from({ length: 30 }, () =>
                service.adjust(1, { type: 'issue', itemId: 10, warehouseId: 1, quantity: 1 }, 99)
            )
        );

        const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
        const rejected = results.filter((r) => r.status === 'rejected').length;

        expect(fulfilled).toBe(20);
        expect(rejected).toBe(10);
        expect(getQuantity(1, 10, 1)).toBe(0);
    });

    test('concurrent transfers between two warehouses preserve total stock', async () => {
        const { models, getQuantity } = createConcurrentStockHarness();
        const service = new StockService(models);

        await service.adjust(1, { type: 'receive', itemId: 10, warehouseId: 1, quantity: 40 }, 99);
        await service.adjust(1, { type: 'receive', itemId: 10, warehouseId: 2, quantity: 10 }, 99);

        await Promise.all([
            ...Array.from({ length: 10 }, () =>
                service.adjust(1, {
                    type: 'transfer',
                    itemId: 10,
                    fromWarehouseId: 1,
                    toWarehouseId: 2,
                    quantity: 2,
                }, 99)
            ),
            ...Array.from({ length: 5 }, () =>
                service.adjust(1, {
                    type: 'transfer',
                    itemId: 10,
                    fromWarehouseId: 2,
                    toWarehouseId: 1,
                    quantity: 1,
                }, 99)
            ),
        ]);

        expect(getQuantity(1, 10, 1) + getQuantity(1, 10, 2)).toBe(50);
        expect(getQuantity(1, 10, 1)).toBe(40 - 20 + 5);
        expect(getQuantity(1, 10, 2)).toBe(10 + 20 - 5);
    });
});
