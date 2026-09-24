import { Op } from 'sequelize';
import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import TechnogexApiClient from './TechnogexApiClient.js';

const FAMILIES = ['products', 'design_items', 'value_packs'];

/**
 * Pulls Technogex's catalog into the local mirror tables. Never hard-deletes
 * a mirror row - a row that drops out of Technogex (soft-deleted or
 * deactivated there) instead gets `source_deleted_at` set, so any Deal/Sales
 * Order line item already pointing at it keeps its frozen `source_meta`
 * snapshot and simply renders "no longer available".
 *
 * Incremental syncs pass `since` (the last successful run's start time) and
 * only reconcile rows Technogex reports as touched; because Technogex is
 * `paranoid: true`, a soft-delete there still bumps `updatedAt`, so recently
 * deleted rows are caught incrementally too. A full resync (no `since`) is
 * still needed periodically to catch drift an incremental filter could miss
 * (e.g. a row untouched since before the last successful run).
 */
class TechnogexSyncService {
    constructor(models, apiClient = new TechnogexApiClient()) {
        this.models = models;
        this.apiClient = apiClient;
    }

    /** @param {'products'|'design_items'|'value_packs'|'all'} family */
    async runSync(family = 'all', { fullResync = false } = {}) {
        if (family === 'all') {
            const results = [];
            for (const f of FAMILIES) {
                results.push(await this.runSync(f, { fullResync }));
            }
            return results;
        }
        if (!FAMILIES.includes(family)) {
            throw new AppError('Unknown sync family.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const { TechnogexSyncRun } = this.models;
        const startedAt = new Date();
        const run = await TechnogexSyncRun.create({ family, status: 'running', started_at: startedAt });

        const since = fullResync ? null : await this._lastSuccessfulRunStart(family);

        try {
            const counts = await this._syncFamily(family, since);
            run.status = 'success';
            run.finished_at = new Date();
            run.fetched_count = counts.fetched;
            run.upserted_count = counts.upserted;
            run.soft_deleted_count = counts.softDeleted;
            await run.save();
            return run;
        } catch (err) {
            run.status = 'failed';
            run.finished_at = new Date();
            run.error_message = err.message?.slice(0, 5000) ?? String(err);
            await run.save();
            throw err;
        }
    }

    async _lastSuccessfulRunStart(family) {
        const { TechnogexSyncRun } = this.models;
        const last = await TechnogexSyncRun.findOne({
            where: { family, status: ['success', 'partial'] },
            order: [['started_at', 'DESC']],
        });
        return last?.started_at ?? null;
    }

    async _syncFamily(family, since) {
        if (family === 'products') return this._syncProducts(since);
        if (family === 'design_items') return this._syncDesignItems(since);
        return this._syncValuePacks(since);
    }

    async _syncProducts(since) {
        const { TechnogexProduct, TechnogexProductPackage } = this.models;
        const products = await this.apiClient.fetchProducts({ since });

        const fetchedIds = [];
        let upserted = 0;
        for (const p of products) {
            fetchedIds.push(p.id);
            const [row] = await TechnogexProduct.findOrCreate({
                where: { external_id: p.id },
                defaults: this._productAttrs(p),
            });
            row.set(this._productAttrs(p));
            await row.save();
            upserted += 1;

            for (const pkg of p.ProductPackages ?? []) {
                const [pkgRow] = await TechnogexProductPackage.findOrCreate({
                    where: { external_id: pkg.id },
                    defaults: this._packageAttrs(pkg, row.id),
                });
                pkgRow.set(this._packageAttrs(pkg, row.id));
                await pkgRow.save();
            }
        }

        const softDeleted = await this._markMissingAsDeleted(TechnogexProduct, fetchedIds, since);
        return { fetched: products.length, upserted, softDeleted };
    }

    async _syncDesignItems(since) {
        const { TechnogexDesignItem } = this.models;
        const items = await this.apiClient.fetchDesignItems({ since });

        const fetchedIds = [];
        let upserted = 0;
        for (const d of items) {
            fetchedIds.push(d.id);
            const attrs = {
                category_external_id: d.categoryId ?? null,
                title: d.title,
                base_price: d.basePrice ?? 0,
                licensing_type: d.licensingType ?? 'standard',
                formats: d.formats ?? null,
                preview_images: d.previewImages ?? null,
                is_active: d.isActive !== false,
                source_deleted_at: d.deletedAt ?? null,
            };
            const [row] = await TechnogexDesignItem.findOrCreate({ where: { external_id: d.id }, defaults: attrs });
            row.set(attrs);
            await row.save();
            upserted += 1;
        }

        const softDeleted = await this._markMissingAsDeleted(TechnogexDesignItem, fetchedIds, since);
        return { fetched: items.length, upserted, softDeleted };
    }

    async _syncValuePacks(since) {
        const { TechnogexValuePack, TechnogexValuePackTier } = this.models;
        const packs = await this.apiClient.fetchValuePacks({ since });

        const fetchedIds = [];
        let upserted = 0;
        for (const vp of packs) {
            fetchedIds.push(vp.id);
            const attrs = {
                name: vp.name,
                slug: vp.slug ?? null,
                active: vp.active !== false,
                source_deleted_at: vp.deletedAt ?? null,
            };
            const [row] = await TechnogexValuePack.findOrCreate({ where: { external_id: vp.id }, defaults: attrs });
            row.set(attrs);
            await row.save();
            upserted += 1;

            for (const tier of vp.tiers ?? []) {
                const tierAttrs = {
                    value_pack_id: row.id,
                    tier_type: tier.tierType,
                    name: tier.name ?? null,
                    duration_external_id: tier.durationId ?? null,
                    country_external_id: tier.countryId ?? null,
                    original_price: tier.originalPrice ?? null,
                    current_price: tier.currentPrice ?? null,
                    is_active: tier.isActive !== false,
                    source_deleted_at: tier.deletedAt ?? null,
                };
                const [tierRow] = await TechnogexValuePackTier.findOrCreate({ where: { external_id: tier.id }, defaults: tierAttrs });
                tierRow.set(tierAttrs);
                await tierRow.save();
            }
        }

        const softDeleted = await this._markMissingAsDeleted(TechnogexValuePack, fetchedIds, since);
        return { fetched: packs.length, upserted, softDeleted };
    }

    _productAttrs(p) {
        return {
            name: p.name,
            description: p.description ?? null,
            category_external_id: p.categoryId ?? null,
            slug: p.slug ?? null,
            product_type: p.productType ?? null,
            image_url: p.image_url ?? null,
            active: p.active !== false,
            source_deleted_at: p.deletedAt ?? null,
            last_synced_at: new Date(),
        };
    }

    _packageAttrs(pkg, productId) {
        return {
            product_id: productId,
            package_type: pkg.packageType,
            tentative_monthly_price: pkg.tentativeMonthlyPrice ?? null,
            final_monthly_price: pkg.finalMonthlyPrice ?? null,
            display_price: pkg.displayPrice ?? null,
            active: pkg.active !== false,
            source_deleted_at: pkg.deletedAt ?? null,
        };
    }

    /**
     * Full resync only: anything not in this fetch and not already flagged
     * is gone from Technogex, so flag it. Skipped on an incremental sync -
     * a `since` filter only returns recently-touched rows, so "missing"
     * there means "unchanged", not "deleted".
     */
    async _markMissingAsDeleted(Model, fetchedExternalIds, since) {
        if (since) return 0;
        const [count] = await Model.update(
            { source_deleted_at: new Date() },
            {
                where: {
                    source_deleted_at: null,
                    external_id: { [Op.notIn]: fetchedExternalIds.length ? fetchedExternalIds : ['__none__'] },
                },
            }
        );
        return count;
    }
}

export default TechnogexSyncService;
