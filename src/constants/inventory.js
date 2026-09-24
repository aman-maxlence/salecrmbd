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

export default {
    STOCK_ADJUSTMENT_TYPES,
    DEFAULT_UOMS,
    DEFAULT_PRICING_TIERS,
    DEFAULT_WAREHOUSE,
    DEFAULT_LOW_STOCK_THRESHOLD,
    toNumber,
};
