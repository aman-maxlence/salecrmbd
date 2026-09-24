/**
 * Permission catalog and default seed matrix - design doc §3.3.
 *
 * `PERMISSIONS` is the full set of valid permission keys any OrgRole.permissions
 * JSON map may contain; PermissionMiddleware only ever checks keys from this
 * list. `view_roles` and `import_leads` aren't in the doc's §3.3 table itself
 * but are required by its own §3.4/§4.2 API tables (view_roles gates the role
 * list/detail GETs, import_leads gates the onboarding Data Import step) - added
 * here so they're not dead/undocumented keys.
 *
 * `DEFAULT_PERMISSION_MATRIX` seeds the four editable default roles
 * (Super Admin is handled separately - see OrgRoleService.seedDefaultRolesForOrg,
 * always all-true and protected). Only the doc's §3.3 sample grid is explicit;
 * everything else here is a reasonable extrapolation flagged for product
 * review, same caveat the doc itself makes ("full grid lives in the seed
 * script, not this doc").
 */
export const PERMISSIONS = [
    // Settings section - parent gate: must be true before ANY settings-area
    // sub-permission below is even checked (see salecrmfe's
    // usePermissions.hasSettingsPermission). Without this, a role could
    // technically hold e.g. manage_organization_settings but that alone
    // used to be the only thing deciding Settings visibility - now it's a
    // two-step check, matching the design doc's "Settings" section being a
    // distinct area from the individual capabilities inside it.
    'access_settings',
    // Org / Roles / Territories
    // manage_organization_settings = workspace branding/personalisation
    // (Profile & Theme: logo, company name, theme, start page - WorkspaceSettings).
    // manage_company_details = legal/billing info (Company Details: contact,
    // tax ID, address, industry, bank details - CompanyDetails). Two
    // deliberately separate models (see their own file comments) - previously
    // both gated by the one key below, so a role couldn't be granted one
    // without the other even though they're unrelated in practice.
    'manage_organization_settings',
    'manage_company_details',
    'manage_roles',
    'view_roles',
    'invite_users',
    'manage_users',
    'manage_teams',
    'manage_territories',
    'manage_departments',
    // Leads / Deals
    'view_all_leads',
    'create_lead',
    'delete_lead',
    'assign_leads',
    'view_all_deals',
    'manage_pipeline',
    // Tasks / Meetings / Tickets
    'view_all_tasks',
    'assign_tasks',
    'manage_meetings',
    'manage_tickets',
    'assign_tickets',
    'view_tickets',
    // Onboarding
    'import_leads',
    // Incentives / Reports / Dashboard
    'manage_incentive_plans',
    'approve_payouts',
    'generate_reports',
    'manage_dashboard',
    // Inventory
    'view_inventory',
    'manage_inventory',
    'adjust_stock',
    'manage_inventory_settings',
    // Vendors / Purchase Orders / Sales Orders
    'view_vendors',
    'manage_vendors',
    'view_purchase_orders',
    'manage_purchase_orders',
    'receive_purchase_orders',
    'view_sales_orders',
    'manage_sales_orders',
    'fulfill_sales_orders',
    // Technogex catalog integration
    'view_technogex_catalog',
    'manage_technogex_sync',
    // Form Builder (generic, cross-module dynamic form/section engine)
    'manage_form_schema',
];

const allTrue = () => Object.fromEntries(PERMISSIONS.map((key) => [key, true]));
const allFalse = () => Object.fromEntries(PERMISSIONS.map((key) => [key, false]));

export const DEFAULT_PERMISSION_MATRIX = {
    // Admin: full access, same content as Super Admin, but editable (not the
    // protected row) - per doc's naming-fix sidebar in §3.2.
    Admin: allTrue(),

    Manager: {
        ...allFalse(),
        // Needed for Manager's existing manage_inventory_settings/manage_form_schema
        // access below - without this they'd be locked out of Settings entirely.
        access_settings: true,
        view_all_leads: true, // scoped to own territory at query time
        view_all_deals: true, // scoped to own territory at query time
        create_lead: true,
        assign_leads: true,
        view_all_tasks: true,
        assign_tasks: true,
        manage_meetings: true,
        view_tickets: true,
        manage_tickets: true,
        assign_tickets: true,
        generate_reports: true,
        manage_dashboard: true,
        view_inventory: true,
        manage_inventory: true,
        adjust_stock: true,
        manage_inventory_settings: true,
        view_vendors: true,
        manage_vendors: true,
        view_purchase_orders: true,
        manage_purchase_orders: true,
        receive_purchase_orders: true,
        view_sales_orders: true,
        manage_sales_orders: true,
        fulfill_sales_orders: true,
        view_technogex_catalog: true,
        manage_technogex_sync: true,
        manage_form_schema: true,
    },

    'Sales Rep': {
        ...allFalse(),
        create_lead: true, // own leads only, enforced at query time
        view_inventory: true, // pick catalog items onto own deals
        view_sales_orders: true,
        view_technogex_catalog: true, // pick Technogex catalog items onto own deals
    },

    'Support Agent': {
        ...allFalse(),
        view_tickets: true,
        manage_tickets: true,
        assign_tickets: true,
    },
};

export default { PERMISSIONS, DEFAULT_PERMISSION_MATRIX };
