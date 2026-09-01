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
    // Org / Roles / Territories
    'manage_organization_settings',
    'manage_roles',
    'view_roles',
    'invite_users',
    'manage_users',
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
];

const allTrue = () => Object.fromEntries(PERMISSIONS.map((key) => [key, true]));
const allFalse = () => Object.fromEntries(PERMISSIONS.map((key) => [key, false]));

export const DEFAULT_PERMISSION_MATRIX = {
    // Admin: full access, same content as Super Admin, but editable (not the
    // protected row) - per doc's naming-fix sidebar in §3.2.
    Admin: allTrue(),

    Manager: {
        ...allFalse(),
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
    },

    'Sales Rep': {
        ...allFalse(),
        create_lead: true, // own leads only, enforced at query time
        view_inventory: true, // pick catalog items onto own deals
    },

    'Support Agent': {
        ...allFalse(),
        view_tickets: true,
        manage_tickets: true,
        assign_tickets: true,
    },
};

export default { PERMISSIONS, DEFAULT_PERMISSION_MATRIX };
