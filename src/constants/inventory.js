export const STOCK_ADJUSTMENT_TYPES = ['receive', 'issue', 'transfer'];

export const DEFAULT_UOMS = [
    { name: 'Each', abbreviation: 'EA' },
    { name: 'Box', abbreviation: 'BOX' },
    { name: 'Kilogram', abbreviation: 'KG' },
];

export const DEFAULT_PRICING_TIERS = [
    { name: 'Standard', discount_percent: 0 },
    { name: 'Wholesale', discount_percent: 10 },
];

export const DEFAULT_WAREHOUSE = { name: 'Main warehouse', code: 'MAIN' };

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export function toNumber(value, fallback = 0) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
}

/**
 * Quantity-based ("buy N+, pay less") volume pricing - picks the break with
 * the highest min_quantity that's still <= the requested quantity, falling
 * back to the item's normal unit_price when no break qualifies (quantity
 * below the smallest break, or no breaks configured at all). Shared by
 * ItemService (surfacing it read-only on the item) and DealService/
 * SalesOrderService (actually pricing a line) so both apply identical logic.
 */
export function resolveQuantityBreakPrice(breaks, quantity, fallbackPrice) {
    const qty = toNumber(quantity, 0);
    let best = null;
    for (const b of breaks ?? []) {
        const minQty = toNumber(b.min_quantity, Infinity);
        if (minQty > qty) continue;
        if (!best || minQty > toNumber(best.min_quantity, 0)) best = b;
    }
    return best ? toNumber(best.unit_price, fallbackPrice) : fallbackPrice;
}

export default {
    STOCK_ADJUSTMENT_TYPES,
    DEFAULT_UOMS,
    DEFAULT_PRICING_TIERS,
    DEFAULT_WAREHOUSE,
    DEFAULT_LOW_STOCK_THRESHOLD,
    toNumber,
    resolveQuantityBreakPrice,
};
