import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('_tmp_ddl_dump.json', 'utf8'));

// Order matters only for readability/down() reversal - no real FK constraints
// are declared anywhere in this schema (confirmed project convention), so
// creation order between these tables is not functionally required.
// Topologically sorted from the actual FK REFERENCES found in each dumped

const order = [
  'company_details',
  'inventory_uoms',
  'inventory_warehouses',
  'inventory_item_categories',
  'inventory_item_brands',
  'inventory_item_manufacturers',
  'inventory_pricing_tiers',
  'vendors',
  'inventory_settings',
  'workspace_settings',
  'inventory_items',
  'inventory_stock_levels',
  'inventory_stock_adjustments',
  'inventory_item_price_history',
  'inventory_low_stock_alerts',
  'purchase_orders',
  'sales_orders',
  'transfer_orders',
  'purchase_order_line_items',
  'sales_order_line_items',
  'transfer_order_line_items',
  'packages',
  'package_line_items',
];

function cleanDdl(ddl) {
  return ddl
    .replace(/\s+AUTO_INCREMENT=\d+/, '')
    .replace(/`([a-zA-Z0-9_]+)`/g, '`$1`'); // no-op, kept for clarity
}

const entries = order.map((t) => ({ table: t, ddl: cleanDdl(dump[t]) }));

const body = `'use strict';

/**
 * Baseline tables for Inventory, Vendors, Purchase/Sales/Transfer Orders,
 * Packages, Company Details, and Workspace Settings - same gap as
 * 20260906_01_create_deals.cjs (see that file's comment): every one of
 * these has only ever existed via dev's \`Database.sync({ alter: true })\`,
 * with no migration ever recording its creation. Found the same way, by
 * migrating a genuinely fresh database end to end.
 *
 * DDL captured verbatim from the long-running dev database via
 * \`SHOW CREATE TABLE\` (stripped of its current AUTO_INCREMENT position),
 * rather than hand-transcribed from the Sequelize model files - dev's
 * schema is the real source of truth after months of \`alter: true\` drift,
 * and transcribing 23 models by hand risked subtly missing an index,
 * default, or ENUM value that only ever got added via sync.
 */
module.exports = {
    async up(queryInterface) {
        const tables = await queryInterface.showAllTables();
${entries.map((e) => `        if (!tables.includes('${e.table}')) {
            await queryInterface.sequelize.query(${JSON.stringify(e.ddl)});
        }`).join('\n')}
    },

    async down(queryInterface) {
${entries.slice().reverse().map((e) => `        await queryInterface.dropTable('${e.table}').catch(() => {});`).join('\n')}
    },
};
`;

fs.writeFileSync('migrations/20260906_03_create_remaining_baseline_tables.cjs', body);
console.log('Wrote migration with', entries.length, 'tables');
