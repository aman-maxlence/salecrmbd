# Sale CRM - Backend Service (`salecrmbd`)

The Sale CRM product's Express/Sequelize/Redis backend. Follows the exact conventions of the sibling
`maxpmbd` and `userbd` services in this workspace, so it plugs into the same platform:

- Auth is **never issued here** - `userbd` issues the `accessToken` cookie at login. This service only
  verifies it (`AuthMiddleware`) and looks the user up in the **shared Redis cache** (`users:<id>` key).
- Multi-tenancy follows the same `org_id` column convention as `maxpmbd` - the organization itself lives
  in `userbd`'s database, this service only stores the ID.
- Module layout: `src/modules/<domain>/{models,service,controller,validation}`, with the corresponding
  route file in `src/routes/<domain>Routes.js`, aggregated in `src/routes/index.js`.

## What's here

- Health check (`/health`) + root info (`/`) + Swagger docs (`/api-docs`)
- Config, error handling, logging, response formatting, Redis client, Sequelize `Database` wrapper
- One fully working module end to end: **Lead** (`/api/leads` - list/get/create/update/delete), matching
  the task-plan spreadsheet's "Setting components of lead" + "Lead API and backend integration" + "Lead UI" tasks.
- A real **webhook receiver** (`/api/webhooks/setup-admin-portal-user`, `/api/webhooks/user-service-invite-accepted`)
  that verifies `userbd`'s HMAC signature - `userbd` already calls these (best-effort) on every
  registration/invite acceptance, see `../INTEGRATION.md`.
- A local **SalesRep** module (`src/modules/salesRep`) mirroring maxpmbd's `portal_users` pattern: the
  webhook handlers above `findOrCreate` a `sales_reps` row per (user, org), and every other module's
  foreign keys point at that local id - **not** the raw userbd user id. `Lead.owner_sales_rep_id` /
  `Lead.created_by_sales_rep_id` are the first example of this; `GET /api/sales-reps` lists an org's reps
  for an owner picker in the UI. `LeadService._getSalesRepId`-equivalent (`SalesRepService.getSalesRepId`)
  throws if a user's sync hasn't happened yet, the same way maxpmbd's `BookmarkService._getPortalUserId` does.
- `environments/{dev,staging,prod}` each with `.env`, `Dockerfile`, `docker-compose.yml` - **dev secrets
  are already copied from `userbd`/`maxpmbd`'s real dev environment**, so this should work locally as-is.
- `PRODUCT_ID` defaults to `2`, matching the already-seeded "Sales CRM" product row (see `../INTEGRATION.md`
  for how to confirm this against the live database).
- Migrations for `sales_reps` (`migrations/20260809_create_sales_reps.cjs`, runs first) and `leads`
  (`migrations/20260810_create_leads.cjs`, FKs into `sales_reps`)

## Adding the next module (Deals, Tasks, Meetings, Incentive, Tickets, Reports, Dashboard)

Copy the `lead` module's four folders as a template:

1. `src/modules/<name>/models/<Name>.js` + `models/index.js` exporting `initialize<Name>Models`
2. `src/modules/<name>/service/<Name>Service.js` - if it has an owner/assignee, inject `SalesRepService`
   and call `getSalesRepId(userId, orgId)` the way `LeadService` does, rather than storing the raw userbd id
3. `src/modules/<name>/controller/<Name>Controller.js`
4. `src/modules/<name>/validation/rules.js` + `validation/index.js`
5. `src/routes/<name>Routes.js`
6. Register the model initializer in `src/models/Database.js` (`sync()`), any associations in
   `src/models/relationships.js`, and the route in `src/routes/index.js`
7. Add a migration under `migrations/` - FK any owner/assignee column to `sales_reps.id`

## Running locally

```bash
npm install
npm run dev:dev   # loads environments/dev/.env
```

Requires a reachable MySQL (`DB_*`) and the **same Redis instance** `userbd` uses (so this service can
read the session `userbd` writes at login). `JWT_SECRET`/`JWT_REFRESH_SECRET` must be copied from
`userbd`'s dev environment exactly, or every request will 401.

See `../INTEGRATION.md` for the small handful of things still needed (confirming the seeded product id,
provisioning the database, staging/prod secrets) - registration, auth, and webhooks are already wired up.
