import { Op } from 'sequelize';
import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { toNumber } from '../../../constants/inventory.js';
import InventorySettingsService from './InventorySettingsService.js';
import FormSchemaService from '../../formSchema/service/FormSchemaService.js';
import S3UploadService from '../../../utils/S3UploadService.js';
import { scopedWhere, assertWarehouseInScope, assertVendorInScope } from '../../../utils/countryScope.js';

const ENTITY_TYPE = 'inventory_item';

class ItemService {
    constructor(models, stockService) {
        this.models = models;
        this.stockService = stockService;
        this.settingsService = new InventorySettingsService(models);
        this.formSchemaService = new FormSchemaService(models);
        this.s3Service = new S3UploadService();
    }

    async getImagePresignedUrl(orgId, filename, contentType) {
        if (!filename || !contentType) {
            throw new AppError('filename and contentType are required', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (!contentType.startsWith('image/')) {
            throw new AppError('File must be an image', 400, ErrorCode.VALIDATION_ERROR);
        }
        return this.s3Service.getSignedUploadUrlForItemImage(orgId, filename, contentType);
    }

    /** Resolves stored S3 keys (front/rear/gallery) into signed GET URLs the frontend can put straight into an <img src>. */
    async _withResolvedImages(item) {
        const plain = item.toJSON ? item.toJSON() : item;
        plain.front_image_url = await this.s3Service.getSignedDownloadUrl(plain.front_image_key);
        plain.rear_image_url = await this.s3Service.getSignedDownloadUrl(plain.rear_image_key);
        plain.gallery_image_urls = await Promise.all(
            (plain.gallery_image_keys ?? []).map((key) => this.s3Service.getSignedDownloadUrl(key))
        );
        return plain;
    }

    async createItem(orgId, payload, changedBy, countryScope) {
        await this.settingsService.ensureDefaults(orgId);
        const fields = await this._catalogFields(orgId);
        const attrs = await this._validateItemPayload(orgId, payload, fields, true, countryScope);

        const { InventoryItem } = this.models;
        const existing = await InventoryItem.findOne({ where: { org_id: orgId, sku: attrs.sku } });
        if (existing) {
            throw new AppError(`An item with SKU "${attrs.sku}" already exists.`, 409, ErrorCode.CONFLICT);
        }
        if (!attrs.barcode) attrs.barcode = attrs.sku;
        const barcodeClash = await InventoryItem.findOne({ where: { org_id: orgId, barcode: attrs.barcode } });
        if (barcodeClash) {
            throw new AppError(`An item with barcode "${attrs.barcode}" already exists.`, 409, ErrorCode.CONFLICT);
        }
        // Validated before the item row is written, so a bad/missing required
        // custom field fails the whole request instead of leaving a
        // half-created item behind. Always runs (even with no
        // customFieldValues at all) so a required custom field left out of
        // the payload entirely is still caught, not just one submitted blank.
        await this.formSchemaService.ensureDefaultSchema(orgId, ENTITY_TYPE);
        await this.formSchemaService.validateValues(orgId, ENTITY_TYPE, payload.customFieldValues, { enforceRequired: true });

        const item = await InventoryItem.create({ org_id: orgId, ...attrs });
        await this._recordPrice(orgId, item.id, attrs.unit_price, changedBy);
        if (payload.customFieldValues) {
            await this.formSchemaService.saveValuesForEntity(orgId, ENTITY_TYPE, item.id, payload.customFieldValues);
        }
        // Guards against a frontend state mismatch (Track Inventory toggled
        // off after an opening-stock quantity was already typed in, or any
        // other client sending both) - a non-tracking item has no stock to
        // seed, so opening stock is simply not applicable, not an error;
        // skip it quietly rather than let stockService.adjust's own
        // track_inventory check throw and leave the just-created item
        // looking like item creation itself failed.
        if (this.stockService && Array.isArray(payload.openingStock) && attrs.track_inventory !== false) {
            for (const entry of payload.openingStock) {
                const quantity = toNumber(entry?.quantity, 0);
                if (!entry?.warehouseId || quantity <= 0) continue;
                await assertWarehouseInScope(this.models, orgId, entry.warehouseId, countryScope, { status: 'active' });
                await this.stockService.adjust(orgId, {
                    type: 'receive',
                    itemId: item.id,
                    warehouseId: entry.warehouseId,
                    locationId: entry.locationId || null,
                    quantity,
                    reason: entry.reason?.trim() || 'Opening stock',
                    referenceType: 'item_creation',
                    referenceId: item.id,
                    referenceNumber: entry.referenceNumber,
                    effectiveDate: entry.effectiveDate,
                }, changedBy);
            }
        }
        return this.getItemById(orgId, item.id);
    }

    /** Duplicates an item's catalog fields (not its stock or price history) - the copy starts at zero stock in every warehouse. */
    async clone(orgId, itemId, createdBy) {
        const source = await this._findItem(orgId, itemId);
        const json = source.toJSON();
        const baseSku = `${json.sku}-COPY`;
        let sku = baseSku;
        let suffix = 2;
        while (await this.models.InventoryItem.findOne({ where: { org_id: orgId, sku } })) {
            sku = `${baseSku}-${suffix++}`;
        }
        const attrs = {
            name: `${json.name} (Copy)`,
            sku,
            category: json.category,
            unitPrice: toNumber(json.unit_price),
            tax: toNumber(json.tax),
            uomId: json.uom_id,
            pricingTierId: json.pricing_tier_id,
            lowStockThreshold: json.low_stock_threshold,
            hsnCode: json.hsn_code,
            upc: json.upc,
            mpn: json.mpn,
            ean: json.ean,
            isbn: json.isbn,
            isReturnable: json.is_returnable,
            preferredVendorId: json.preferred_vendor_id,
        };
        return this.createItem(orgId, attrs, createdBy);
    }

    /** Per warehouse: on-hand stock, quantity committed to open Sales Orders in that warehouse, its assigned location (if any), and what's left available. */
    async getStockBreakdown(orgId, itemId, countryScope) {
        const { Warehouse, StockLevel, StockLocation, SalesOrder, SalesOrderLineItem } = this.models;
        await this._findItem(orgId, itemId);

        const warehouses = await Warehouse.findAll({
            where: scopedWhere({ org_id: orgId, status: 'active' }, countryScope),
            order: [['name', 'ASC']],
        });
        const levels = await StockLevel.findAll({
            where: { org_id: orgId, item_id: itemId },
            include: [{ model: StockLocation, as: 'location', required: false }],
        });
        const levelByWarehouse = new Map(levels.map((l) => [l.warehouse_id, l]));

        const openLines = await SalesOrderLineItem.findAll({
            where: { org_id: orgId, item_id: itemId },
            include: [{ model: SalesOrder, as: 'salesOrder', required: true, where: { status: ['pending', 'partially_fulfilled'] } }],
        });
        const committedByWarehouse = new Map();
        for (const line of openLines) {
            const remaining = toNumber(line.quantity) - toNumber(line.fulfilled_quantity);
            if (remaining <= 0) continue;
            const key = line.salesOrder.warehouse_id;
            committedByWarehouse.set(key, (committedByWarehouse.get(key) ?? 0) + remaining);
        }

        return warehouses.map((w) => {
            const level = levelByWarehouse.get(w.id);
            const onHand = level ? toNumber(level.quantity) : 0;
            const committed = committedByWarehouse.get(w.id) ?? 0;
            return {
                warehouseId: w.id,
                warehouseName: w.name,
                onHand,
                committed,
                available: onHand - committed,
                locationId: level?.location_id ?? null,
                locationName: level?.location?.name ?? null,
                locationType: level?.location?.type ?? null,
            };
        });
    }

    /** Quantity still owed to this item across open (non-final) Purchase Order lines - "To be Received" on the item detail page. */
    async getToBeReceived(orgId, itemId) {
        const { PurchaseOrder, PurchaseOrderLineItem } = this.models;
        const lines = await PurchaseOrderLineItem.findAll({
            where: { org_id: orgId, item_id: itemId },
            include: [{ model: PurchaseOrder, as: 'purchaseOrder', required: true, where: { status: ['ordered', 'partially_received'] } }],
        });
        return lines.reduce((sum, line) => sum + Math.max(0, toNumber(line.quantity) - toNumber(line.received_quantity)), 0);
    }

    async updateItem(orgId, itemId, payload, changedBy, countryScope) {
        const item = await this._findItem(orgId, itemId);
        const fields = await this._catalogFields(orgId);
        // The service/track-inventory tie in _validateItemPayload needs to know the item's resulting type
        // even when this update doesn't touch itemType, so an existing service item can't accidentally
        // regain track_inventory via a trackInventory-only update.
        const effectivePayload = payload.itemType === undefined ? { ...payload, itemType: item.item_type } : payload;
        const attrs = await this._validateItemPayload(orgId, effectivePayload, fields, false, countryScope);
        if (payload.itemType === undefined) delete attrs.item_type;

        // Matches the warning already shown on the Track Inventory toggle
        // ("You cannot enable/disable inventory tracking once you've created
        // transactions for this item") - previously just UI text with no
        // backend enforcement behind it, so flipping it off on an item that
        // already had recorded stock movements silently orphaned that
        // history (StockLevel rows still there, but getStockBreakdown/adjust
        // would refuse to touch the item at all).
        if (attrs.track_inventory !== undefined && attrs.track_inventory !== item.track_inventory) {
            const adjustmentCount = await this.models.StockAdjustment.count({ where: { org_id: orgId, item_id: item.id } });
            if (adjustmentCount > 0) {
                throw new AppError(
                    "Can't change inventory tracking - this item already has recorded stock transactions.",
                    409,
                    ErrorCode.CONFLICT
                );
            }
        }

        if (attrs.sku && attrs.sku !== item.sku) {
            const existing = await this.models.InventoryItem.findOne({
                where: { org_id: orgId, sku: attrs.sku, id: { [Op.ne]: item.id } },
            });
            if (existing) throw new AppError(`An item with SKU "${attrs.sku}" already exists.`, 409, ErrorCode.CONFLICT);
        }
        if (attrs.barcode && attrs.barcode !== item.barcode) {
            const clash = await this.models.InventoryItem.findOne({
                where: { org_id: orgId, barcode: attrs.barcode, id: { [Op.ne]: item.id } },
            });
            if (clash) throw new AppError(`An item with barcode "${attrs.barcode}" already exists.`, 409, ErrorCode.CONFLICT);
        }
        if (payload.customFieldValues) {
            // enforceRequired here too, not just on create - otherwise a required
            // custom field could be blanked out by an update that simply omits
            // it, since validateValues without this flag only checks values that
            // ARE present, not that every required field still has one.
            await this.formSchemaService.validateValues(orgId, ENTITY_TYPE, payload.customFieldValues, { enforceRequired: true });
        }

        const priceChanged = attrs.unit_price !== undefined && toNumber(attrs.unit_price) !== toNumber(item.unit_price);
        const staleImageKeys = [];
        if (attrs.front_image_key !== undefined && item.front_image_key && item.front_image_key !== attrs.front_image_key) {
            staleImageKeys.push(item.front_image_key);
        }
        if (attrs.rear_image_key !== undefined && item.rear_image_key && item.rear_image_key !== attrs.rear_image_key) {
            staleImageKeys.push(item.rear_image_key);
        }
        if (attrs.gallery_image_keys !== undefined) {
            const keptKeys = new Set(attrs.gallery_image_keys);
            for (const key of item.gallery_image_keys ?? []) {
                if (!keptKeys.has(key)) staleImageKeys.push(key);
            }
        }
        Object.assign(item, attrs);
        await item.save();
        for (const key of staleImageKeys) {
            this.s3Service.deleteFile(key).catch(() => {});
        }
        if (priceChanged) {
            await this._recordPrice(orgId, item.id, item.unit_price, changedBy);
        }
        if (payload.customFieldValues) {
            await this.formSchemaService.saveValuesForEntity(orgId, ENTITY_TYPE, item.id, payload.customFieldValues);
        }
        return this.getItemById(orgId, item.id);
    }

    async deleteItem(orgId, itemId) {
        const item = await this._findItem(orgId, itemId);
        const { DealLineItem } = this.models;
        const onDeals = await DealLineItem.count({ where: { org_id: orgId, item_id: itemId } });
        if (onDeals > 0) {
            throw new AppError(`This item is attached to ${onDeals} deal line(s). Remove those first.`, 409, ErrorCode.CONFLICT);
        }
        item.status = 'inactive';
        await item.save();
        return item;
    }

    async activateItem(orgId, itemId) {
        const item = await this._findItem(orgId, itemId);
        item.status = 'active';
        await item.save();
        return this.getItemById(orgId, item.id);
    }

    async searchItems(orgId, { q, category, status, groupByCategory, itemType } = {}) {
        const { InventoryItem, StockLevel, UnitOfMeasure, PricingTier, FormFieldDefinition, FormFieldValue } = this.models;
        const where = { org_id: orgId };
        if (status) where.status = status;
        else where.status = 'active';
        if (category) where.category = category;
        if (q?.trim()) {
            const like = { [Op.like]: `%${q.trim()}%` };
            where[Op.or] = [{ sku: like }, { name: like }, { category: like }, { barcode: like }];
        }
        // "Item Type" here is whichever custom field an org gave the field_key 'item_type' in
        // Form Builder (not the real, mostly-vestigial InventoryItem.item_type column) - its
        // value lives in FormFieldValue (EAV), so filtering means resolving matching entity ids
        // first, then intersecting with the rest of this search.
        if (itemType) {
            const field = await FormFieldDefinition.findOne({
                where: { org_id: orgId, entity_type: ENTITY_TYPE, field_key: 'item_type' },
            });
            let matchingIds = [];
            if (field) {
                const rows = await FormFieldValue.findAll({
                    where: { org_id: orgId, entity_type: ENTITY_TYPE, field_id: field.id },
                });
                matchingIds = rows.filter((r) => r.value === itemType).map((r) => r.entity_id);
            }
            where.id = { [Op.in]: matchingIds.length ? matchingIds : [0] };
        }

        const items = await InventoryItem.findAll({
            where,
            include: [
                { model: UnitOfMeasure, as: 'uom', required: false },
                { model: PricingTier, as: 'pricingTier', required: false },
                { model: StockLevel, as: 'stockLevels', required: false },
            ],
            order: [['name', 'ASC']],
        });

        const serialized = await Promise.all(items.map((item) => this._serializeListItem(item)));
        const categories = [...new Set(serialized.map((i) => i.category).filter(Boolean))].sort();

        if (groupByCategory) {
            const groups = {};
            for (const item of serialized) {
                const key = item.category || 'Uncategorized';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            }
            return { items: serialized, categories, groups };
        }

        return { items: serialized, categories };
    }

    async getItemById(orgId, itemId) {
        const { InventoryItem, StockLevel, Warehouse, StockLocation, UnitOfMeasure, PricingTier, ItemPriceHistory, ItemQuantityPriceBreak, DealLineItem, Deal, Vendor, ItemCategory, ItemBrand, ItemManufacturer } = this.models;
        const item = await InventoryItem.findOne({
            where: { id: itemId, org_id: orgId },
            include: [
                { model: UnitOfMeasure, as: 'uom', required: false },
                { model: PricingTier, as: 'pricingTier', required: false },
                { model: Vendor, as: 'preferredVendor', required: false },
                { model: ItemCategory, as: 'categoryRef', required: false },
                { model: ItemBrand, as: 'brandRef', required: false },
                { model: ItemManufacturer, as: 'manufacturerRef', required: false },
                {
                    model: StockLevel,
                    as: 'stockLevels',
                    required: false,
                    include: [
                        { model: Warehouse, as: 'warehouse', required: false },
                        { model: StockLocation, as: 'location', required: false },
                    ],
                },
                { model: ItemPriceHistory, as: 'priceHistory', required: false, separate: true, order: [['created_at', 'DESC']] },
                { model: ItemQuantityPriceBreak, as: 'quantityPriceBreaks', required: false, separate: true, order: [['min_quantity', 'ASC']] },
                {
                    model: DealLineItem,
                    as: 'dealLineItems',
                    required: false,
                    include: [{ model: Deal, as: 'deal', required: false }],
                },
            ],
        });
        if (!item) throw new AppError('Item not found.', 404, ErrorCode.NOT_FOUND);
        const plain = await this._withResolvedImages(item);
        plain.fieldValues = await this.formSchemaService.getValuesForEntity(orgId, ENTITY_TYPE, itemId);
        return plain;
    }

    async findByBarcode(orgId, barcode) {
        const item = await this.models.InventoryItem.findOne({ where: { org_id: orgId, barcode, status: 'active' } });
        if (!item) throw new AppError('No item found with that barcode.', 404, ErrorCode.NOT_FOUND);
        return this.getItemById(orgId, item.id);
    }

    async _findItem(orgId, itemId) {
        const item = await this.models.InventoryItem.findOne({ where: { id: itemId, org_id: orgId } });
        if (!item) throw new AppError('Item not found.', 404, ErrorCode.NOT_FOUND);
        return item;
    }

    // Required-ness for these four fields used to live on InventorySettings.catalog_fields,
    // configured from a dedicated "Item/product catalog fields" Settings section. That section
    // is gone now that Settings -> Form Builder configures required/visible for every builtin
    // field (these four included) - this just re-fetches the same four flags from there, keeping
    // _validateItemPayload's `required(key)` checks below completely unchanged.
    async _catalogFields(orgId) {
        const keyMap = {
            sku: 'sku', category: 'category_id', unitPrice: 'unit_price', tax: 'tax',
            // Beyond the four legacy fields above, any other builtin field an
            // admin can mark "Required" in Form Builder - excludes booleans,
            // enums-with-defaults, and images, where "required and empty"
            // isn't a meaningful state to check for.
            barcode: 'barcode', upc: 'upc', mpn: 'mpn', ean: 'ean', isbn: 'isbn',
            description: 'description', uomId: 'uom_id', brandId: 'brand_id', manufacturerId: 'manufacturer_id',
            pricingTierId: 'pricing_tier_id',
            lowStockThreshold: 'low_stock_threshold', costPrice: 'cost_price',
            length: 'length', width: 'width', height: 'height', weight: 'weight',
        };
        const flags = await this.formSchemaService.getRequiredFlags(orgId, ENTITY_TYPE, Object.values(keyMap));
        const result = {};
        for (const [oldKey, newKey] of Object.entries(keyMap)) {
            result[oldKey] = { enabled: true, required: flags[newKey] };
        }
        return result;
    }

    async _validateItemPayload(orgId, payload, fields, isCreate, countryScope) {
        const required = (key) => fields[key]?.enabled !== false && fields[key]?.required;

        const name = payload.name?.trim();
        if (isCreate || payload.name !== undefined) {
            if (!name) throw new AppError('Item name is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        let sku = payload.sku?.trim();
        if (isCreate && !sku) {
            sku = await this.settingsService.generateNextSku(orgId);
        }
        if (required('sku') && (isCreate || payload.sku !== undefined) && !payload.sku?.trim()) {
            throw new AppError('SKU is required.', 400, ErrorCode.VALIDATION_ERROR);
        }
        // Even when the schema doesn't mark SKU as required, an empty string
        // is never valid once the item already exists - the column has a
        // unique (org_id, sku) index, so a second item saved with a blank
        // SKU would hit a raw duplicate-key error instead of this message.
        if (!isCreate && payload.sku !== undefined && !sku) {
            throw new AppError('SKU cannot be blank.', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (sku !== undefined && sku !== null && sku.length > 100) {
            throw new AppError('SKU must be 100 characters or fewer.', 400, ErrorCode.VALIDATION_ERROR);
        }

        if (
            required('category') &&
            (isCreate || payload.category !== undefined || payload.categoryId !== undefined) &&
            !payload.category?.trim() && !payload.categoryId
        ) {
            throw new AppError('Category is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const unitPrice = payload.unitPrice !== undefined ? toNumber(payload.unitPrice, NaN) : undefined;
        if (required('unitPrice') && (isCreate || payload.unitPrice !== undefined)) {
            if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                throw new AppError('Unit price must be a number greater than or equal to 0.', 400, ErrorCode.VALIDATION_ERROR);
            }
        }

        // A queued future price change - both sides must be cleared or set
        // together (a price with no date would never apply; a date with no
        // price is meaningless), unless a request only touches one of the
        // two because it's not changing that side at all (undefined).
        let scheduledPriceUpdate;
        if (payload.scheduledPrice !== undefined || payload.priceEffectiveDate !== undefined) {
            const clearingBoth = payload.scheduledPrice === null && payload.priceEffectiveDate === null;
            if (clearingBoth) {
                scheduledPriceUpdate = { scheduled_price: null, price_effective_date: null };
            } else {
                if (!payload.scheduledPrice || !payload.priceEffectiveDate) {
                    throw new AppError('A scheduled price needs both a price and an effective date.', 400, ErrorCode.VALIDATION_ERROR);
                }
                const scheduledPrice = toNumber(payload.scheduledPrice, NaN);
                if (!Number.isFinite(scheduledPrice) || scheduledPrice < 0) {
                    throw new AppError('Scheduled price must be a number greater than or equal to 0.', 400, ErrorCode.VALIDATION_ERROR);
                }
                const effectiveDate = new Date(payload.priceEffectiveDate);
                if (Number.isNaN(effectiveDate.getTime())) {
                    throw new AppError('Effective date is not a valid date.', 400, ErrorCode.VALIDATION_ERROR);
                }
                scheduledPriceUpdate = { scheduled_price: scheduledPrice, price_effective_date: payload.priceEffectiveDate };
            }
        }

        const tax = payload.tax !== undefined ? toNumber(payload.tax, NaN) : undefined;
        if (payload.tax !== undefined && (!Number.isFinite(tax) || tax < 0 || tax > 100)) {
            throw new AppError('Tax must be between 0 and 100.', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (required('tax') && (isCreate || payload.tax !== undefined) && payload.tax === undefined) {
            throw new AppError('Tax is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        if (payload.uomId) {
            const uom = await this.models.UnitOfMeasure.findOne({ where: { id: payload.uomId, org_id: orgId } });
            if (!uom) throw new AppError('Unit of measure not found.', 404, ErrorCode.NOT_FOUND);
        }
        if (payload.pricingTierId) {
            const tier = await this.models.PricingTier.findOne({ where: { id: payload.pricingTierId, org_id: orgId } });
            if (!tier) throw new AppError('Pricing tier not found.', 404, ErrorCode.NOT_FOUND);
        }

        const attrs = {};
        if (name !== undefined && (isCreate || payload.name !== undefined)) attrs.name = name;
        if (sku !== undefined && (isCreate || payload.sku !== undefined)) attrs.sku = sku;
        if (payload.category !== undefined) attrs.category = payload.category?.trim() || null;
        if (unitPrice !== undefined && Number.isFinite(unitPrice)) attrs.unit_price = unitPrice;
        else if (isCreate) attrs.unit_price = 0;
        if (tax !== undefined && Number.isFinite(tax)) attrs.tax = tax;
        else if (isCreate) attrs.tax = 0;
        if (payload.uomId !== undefined) attrs.uom_id = payload.uomId || null;
        if (payload.pricingTierId !== undefined) attrs.pricing_tier_id = payload.pricingTierId || null;
        if (scheduledPriceUpdate) Object.assign(attrs, scheduledPriceUpdate);
        if (payload.lowStockThreshold !== undefined) {
            if (payload.lowStockThreshold === null || payload.lowStockThreshold === '') {
                attrs.low_stock_threshold = null;
            } else {
                const threshold = toNumber(payload.lowStockThreshold, NaN);
                if (!Number.isFinite(threshold) || threshold < 0) {
                    throw new AppError('Low-stock threshold must be a number greater than or equal to 0.', 400, ErrorCode.VALIDATION_ERROR);
                }
                attrs.low_stock_threshold = threshold;
            }
        }
        if (payload.status !== undefined) {
            if (!['active', 'inactive'].includes(payload.status)) {
                throw new AppError('Status must be "active" or "inactive".', 400, ErrorCode.VALIDATION_ERROR);
            }
            attrs.status = payload.status;
        }
        if (payload.barcode !== undefined) {
            const barcode = payload.barcode?.trim() || null;
            if (barcode && barcode.length > 100) {
                throw new AppError('Barcode must be 100 characters or fewer.', 400, ErrorCode.VALIDATION_ERROR);
            }
            attrs.barcode = barcode;
        }
        const shortCode = (value, label, maxLength) => {
            const trimmed = value?.trim() || null;
            if (trimmed && trimmed.length > maxLength) {
                throw new AppError(`${label} must be ${maxLength} characters or fewer.`, 400, ErrorCode.VALIDATION_ERROR);
            }
            return trimmed;
        };
        if (payload.hsnCode !== undefined) attrs.hsn_code = shortCode(payload.hsnCode, 'HSN code', 20);
        if (payload.upc !== undefined) attrs.upc = shortCode(payload.upc, 'UPC', 20);
        if (payload.mpn !== undefined) attrs.mpn = shortCode(payload.mpn, 'MPN', 50);
        if (payload.ean !== undefined) attrs.ean = shortCode(payload.ean, 'EAN', 20);
        if (payload.isbn !== undefined) attrs.isbn = shortCode(payload.isbn, 'ISBN', 20);
        if (payload.isReturnable !== undefined) attrs.is_returnable = Boolean(payload.isReturnable);
        else if (isCreate) attrs.is_returnable = true;
        if (payload.preferredVendorId !== undefined) {
            if (payload.preferredVendorId) {
                await assertVendorInScope(this.models, orgId, payload.preferredVendorId, countryScope);
            }
            attrs.preferred_vendor_id = payload.preferredVendorId || null;
        }

        let itemType = payload.itemType;
        if (itemType !== undefined) {
            if (!['goods', 'service'].includes(itemType)) {
                throw new AppError('Type must be "goods" or "service".', 400, ErrorCode.VALIDATION_ERROR);
            }
            attrs.item_type = itemType;
        } else if (isCreate) {
            itemType = 'goods';
            attrs.item_type = itemType;
        }
        if (payload.brand !== undefined) attrs.brand = payload.brand?.trim() || null;
        if (payload.manufacturer !== undefined) attrs.manufacturer = payload.manufacturer?.trim() || null;
        if (payload.description !== undefined) {
            const description = payload.description?.trim() || null;
            if (description && description.length > 2000) {
                throw new AppError('Description must be 2000 characters or fewer.', 400, ErrorCode.VALIDATION_ERROR);
            }
            attrs.description = description;
        }
        if (payload.costPrice !== undefined) {
            if (payload.costPrice === null || payload.costPrice === '') {
                attrs.cost_price = null;
            } else {
                const costPrice = toNumber(payload.costPrice, NaN);
                if (!Number.isFinite(costPrice) || costPrice < 0) {
                    throw new AppError('Cost price must be a number greater than or equal to 0.', 400, ErrorCode.VALIDATION_ERROR);
                }
                attrs.cost_price = costPrice;
            }
        }
        if (payload.salesAccount !== undefined) attrs.sales_account = payload.salesAccount?.trim() || null;
        if (payload.purchaseAccount !== undefined) attrs.purchase_account = payload.purchaseAccount?.trim() || null;
        // Service items never track inventory, regardless of what's sent - goods respect the toggle (default true on create).
        if (itemType === 'service') {
            attrs.track_inventory = false;
        } else if (payload.trackInventory !== undefined) {
            attrs.track_inventory = Boolean(payload.trackInventory);
        } else if (isCreate) {
            attrs.track_inventory = true;
        }
        if (payload.frontImageKey !== undefined) attrs.front_image_key = payload.frontImageKey || null;
        if (payload.rearImageKey !== undefined) attrs.rear_image_key = payload.rearImageKey || null;
        if (payload.galleryImageKeys !== undefined) attrs.gallery_image_keys = Array.isArray(payload.galleryImageKeys) ? payload.galleryImageKeys : [];
        const nonNegative = (value, label) => {
            if (value === null || value === '') return null;
            const n = toNumber(value, NaN);
            if (!Number.isFinite(n) || n < 0) {
                throw new AppError(`${label} must be a number greater than or equal to 0.`, 400, ErrorCode.VALIDATION_ERROR);
            }
            return n;
        };
        if (payload.length !== undefined) attrs.length = nonNegative(payload.length, 'Length');
        if (payload.width !== undefined) attrs.width = nonNegative(payload.width, 'Width');
        if (payload.height !== undefined) attrs.height = nonNegative(payload.height, 'Height');
        if (payload.dimensionUnit !== undefined) attrs.dimension_unit = payload.dimensionUnit || 'cm';
        if (payload.weight !== undefined) attrs.weight = nonNegative(payload.weight, 'Weight');
        if (payload.weightUnit !== undefined) attrs.weight_unit = payload.weightUnit || 'kg';

        if (payload.categoryId !== undefined) {
            attrs.category_id = payload.categoryId || null;
            if (payload.categoryId) {
                const cat = await this.models.ItemCategory.findOne({ where: { id: payload.categoryId, org_id: orgId } });
                if (!cat) throw new AppError('Category not found.', 404, ErrorCode.NOT_FOUND);
                attrs.category = cat.name;
            } else {
                attrs.category = null;
            }
        }
        if (payload.brandId !== undefined) {
            attrs.brand_id = payload.brandId || null;
            if (payload.brandId) {
                const brand = await this.models.ItemBrand.findOne({ where: { id: payload.brandId, org_id: orgId } });
                if (!brand) throw new AppError('Brand not found.', 404, ErrorCode.NOT_FOUND);
                attrs.brand = brand.name;
            } else {
                attrs.brand = null;
            }
        }
        if (payload.manufacturerId !== undefined) {
            attrs.manufacturer_id = payload.manufacturerId || null;
            if (payload.manufacturerId) {
                const mfr = await this.models.ItemManufacturer.findOne({ where: { id: payload.manufacturerId, org_id: orgId } });
                if (!mfr) throw new AppError('Manufacturer not found.', 404, ErrorCode.NOT_FOUND);
                attrs.manufacturer = mfr.name;
            } else {
                attrs.manufacturer = null;
            }
        }
        if (payload.inventoryAccount !== undefined) attrs.inventory_account = payload.inventoryAccount?.trim() || null;
        if (payload.inventoryValuationMethod !== undefined) {
            if (!['fifo', 'weighted_average'].includes(payload.inventoryValuationMethod)) {
                throw new AppError('Inventory valuation method must be "fifo" or "weighted_average".', 400, ErrorCode.VALIDATION_ERROR);
            }
            attrs.inventory_valuation_method = payload.inventoryValuationMethod;
        }

        // Generic required-enforcement for any of the builtin fields covered by
        // _catalogFields beyond the four with their own bespoke checks above.
        // Only runs when the request actually touches the field (or on create),
        // matching those checks' own convention.
        const genericRequiredChecks = [
            { key: 'barcode', attrsKey: 'barcode', label: 'Barcode' },
            { key: 'upc', attrsKey: 'upc', label: 'UPC' },
            { key: 'mpn', attrsKey: 'mpn', label: 'MPN' },
            { key: 'ean', attrsKey: 'ean', label: 'EAN' },
            { key: 'isbn', attrsKey: 'isbn', label: 'ISBN' },
            { key: 'description', attrsKey: 'description', label: 'Description' },
            { key: 'uomId', attrsKey: 'uom_id', label: 'Unit of measure' },
            { key: 'brandId', attrsKey: 'brand_id', label: 'Brand' },
            { key: 'manufacturerId', attrsKey: 'manufacturer_id', label: 'Manufacturer' },
            { key: 'pricingTierId', attrsKey: 'pricing_tier_id', label: 'Pricing tier' },
            { key: 'lowStockThreshold', attrsKey: 'low_stock_threshold', label: 'Low-stock threshold' },
            { key: 'costPrice', attrsKey: 'cost_price', label: 'Cost price' },
            { key: 'length', attrsKey: 'length', label: 'Length' },
            { key: 'width', attrsKey: 'width', label: 'Width' },
            { key: 'height', attrsKey: 'height', label: 'Height' },
            { key: 'weight', attrsKey: 'weight', label: 'Weight' },
        ];
        for (const check of genericRequiredChecks) {
            if (!required(check.key)) continue;
            if (!isCreate && payload[check.key] === undefined) continue;
            const value = attrs[check.attrsKey];
            if (value === undefined || value === null || value === '') {
                throw new AppError(`${check.label} is required.`, 400, ErrorCode.VALIDATION_ERROR);
            }
        }

        return attrs;
    }

    async _recordPrice(orgId, itemId, unitPrice, changedBy) {
        await this.models.ItemPriceHistory.create({
            org_id: orgId,
            item_id: itemId,
            unit_price: toNumber(unitPrice),
            changed_by: changedBy ?? null,
        });
    }

    /**
     * Sweep every org for items whose scheduled price's effective date has
     * arrived (<= today) and applies it - moves scheduled_price into
     * unit_price, clears both scheduled fields, and records the change in
     * ItemPriceHistory (changed_by null = applied by the system, not a
     * user). Run periodically by the same job scheduler as the low-stock
     * alert sweep (see src/index.js).
     */
    async applyScheduledPriceChanges() {
        const { InventoryItem } = this.models;
        const today = new Date().toISOString().slice(0, 10);
        const due = await InventoryItem.findAll({
            where: {
                scheduled_price: { [Op.ne]: null },
                price_effective_date: { [Op.lte]: today },
            },
        });
        for (const item of due) {
            const newPrice = toNumber(item.scheduled_price);
            item.unit_price = newPrice;
            item.scheduled_price = null;
            item.price_effective_date = null;
            await item.save();
            await this._recordPrice(item.org_id, item.id, newPrice, null);
        }
        return due.length;
    }

    // ==================== QUANTITY-BASED PRICING (per-item volume breaks) ====================

    async listPriceBreaks(orgId, itemId) {
        await this._findItem(orgId, itemId);
        return this.models.ItemQuantityPriceBreak.findAll({
            where: { org_id: orgId, item_id: itemId },
            order: [['min_quantity', 'ASC']],
        });
    }

    _validatePriceBreak({ minQuantity, unitPrice }) {
        const qty = toNumber(minQuantity, NaN);
        if (!Number.isInteger(qty) || qty < 1) {
            throw new AppError('Minimum quantity must be a whole number of 1 or more.', 400, ErrorCode.VALIDATION_ERROR);
        }
        const price = toNumber(unitPrice, NaN);
        if (!Number.isFinite(price) || price < 0) {
            throw new AppError('Unit price must be a number greater than or equal to 0.', 400, ErrorCode.VALIDATION_ERROR);
        }
        return { qty, price };
    }

    async createPriceBreak(orgId, itemId, payload) {
        await this._findItem(orgId, itemId);
        const { qty, price } = this._validatePriceBreak(payload);
        const existing = await this.models.ItemQuantityPriceBreak.findOne({
            where: { org_id: orgId, item_id: itemId, min_quantity: qty },
        });
        if (existing) throw new AppError(`A price break already exists at quantity ${qty}.`, 409, ErrorCode.CONFLICT);
        return this.models.ItemQuantityPriceBreak.create({
            org_id: orgId,
            item_id: itemId,
            min_quantity: qty,
            unit_price: price,
        });
    }

    async updatePriceBreak(orgId, itemId, breakId, payload) {
        await this._findItem(orgId, itemId);
        const row = await this.models.ItemQuantityPriceBreak.findOne({ where: { id: breakId, org_id: orgId, item_id: itemId } });
        if (!row) throw new AppError('Price break not found.', 404, ErrorCode.NOT_FOUND);
        const { qty, price } = this._validatePriceBreak({
            minQuantity: payload.minQuantity ?? row.min_quantity,
            unitPrice: payload.unitPrice ?? row.unit_price,
        });
        if (qty !== row.min_quantity) {
            const clash = await this.models.ItemQuantityPriceBreak.findOne({
                where: { org_id: orgId, item_id: itemId, min_quantity: qty, id: { [Op.ne]: breakId } },
            });
            if (clash) throw new AppError(`A price break already exists at quantity ${qty}.`, 409, ErrorCode.CONFLICT);
        }
        row.min_quantity = qty;
        row.unit_price = price;
        await row.save();
        return row;
    }

    async deletePriceBreak(orgId, itemId, breakId) {
        await this._findItem(orgId, itemId);
        const row = await this.models.ItemQuantityPriceBreak.findOne({ where: { id: breakId, org_id: orgId, item_id: itemId } });
        if (!row) throw new AppError('Price break not found.', 404, ErrorCode.NOT_FOUND);
        await row.destroy();
    }

    /** Per-item on-hand quantity summed across all warehouses, plus the per-warehouse split. */
    async getStockSummaryReport(orgId) {
        const { InventoryItem, StockLevel, Warehouse } = this.models;
        const items = await InventoryItem.findAll({
            where: { org_id: orgId, status: 'active' },
            include: [{
                model: StockLevel,
                as: 'stockLevels',
                required: false,
                include: [{ model: Warehouse, as: 'warehouse', required: false }],
            }],
            order: [['name', 'ASC']],
        });
        return items.map((item) => {
            const json = item.toJSON();
            const levels = json.stockLevels ?? [];
            const onHand = levels.reduce((sum, row) => sum + toNumber(row.quantity), 0);
            const warehouses = levels
                .filter((row) => toNumber(row.quantity) > 0)
                .map((row) => ({
                    warehouseId: row.warehouse_id,
                    warehouseName: row.warehouse?.name ?? `Warehouse #${row.warehouse_id}`,
                    onHand: toNumber(row.quantity),
                }))
                .sort((a, b) => b.onHand - a.onHand);
            return { id: item.id, sku: item.sku, name: item.name, category: item.category, on_hand: onHand, warehouses };
        });
    }

    /**
     * Every "receive" stock movement that came from a Purchase Order - who
     * it was bought from and when, not just the running on-hand total.
     * Reads StockAdjustment (the actual per-event ledger) rather than
     * PurchaseOrderLineItem.received_quantity (a flat accumulator that can't
     * tell two separate partial receipts apart).
     */
    async getPurchaseHistoryReport(orgId, { itemId, vendorId } = {}) {
        const { StockAdjustment, InventoryItem, PurchaseOrder, PurchaseOrderLineItem, Vendor, Warehouse } = this.models;

        const where = { org_id: orgId, type: 'receive', reference_type: 'purchase_order' };
        if (itemId) where.item_id = itemId;

        const adjustments = await StockAdjustment.findAll({
            where,
            include: [
                { model: InventoryItem, as: 'item', required: true },
                { model: Warehouse, as: 'toWarehouse', required: false },
            ],
            order: [['created_at', 'DESC']],
        });
        if (adjustments.length === 0) return [];

        const poIds = [...new Set(adjustments.map((a) => a.reference_id))];
        const purchaseOrders = await PurchaseOrder.findAll({
            where: { id: poIds, org_id: orgId },
            include: [{ model: Vendor, as: 'vendor', required: false }],
        });
        const poById = new Map(purchaseOrders.map((po) => [po.id, po]));

        const lines = await PurchaseOrderLineItem.findAll({ where: { purchase_order_id: poIds, org_id: orgId } });
        const unitCostByPoItem = new Map(lines.map((l) => [`${l.purchase_order_id}:${l.item_id}`, toNumber(l.unit_cost)]));

        const rows = adjustments
            .filter((a) => poById.has(a.reference_id))
            .map((a) => {
                const po = poById.get(a.reference_id);
                const unitCost = unitCostByPoItem.get(`${a.reference_id}:${a.item_id}`) ?? null;
                const quantity = toNumber(a.quantity);
                return {
                    id: a.id,
                    date: a.effective_date || a.created_at,
                    itemId: a.item_id,
                    itemName: a.item?.name,
                    sku: a.item?.sku,
                    vendorId: po.vendor_id,
                    vendorName: po.vendor?.name ?? null,
                    purchaseOrderId: po.id,
                    warehouseName: a.toWarehouse?.name ?? null,
                    quantity,
                    unitCost,
                    total: unitCost != null ? unitCost * quantity : null,
                };
            });

        return vendorId ? rows.filter((r) => Number(r.vendorId) === Number(vendorId)) : rows;
    }

    /** Per-item on-hand x unit_price, plus a grand total. */
    async getValuationReport(orgId) {
        const rows = await this.getStockSummaryReport(orgId);
        const { InventoryItem } = this.models;
        const prices = await InventoryItem.findAll({ where: { org_id: orgId, status: 'active' }, attributes: ['id', 'unit_price'] });
        const priceById = new Map(prices.map((p) => [p.id, toNumber(p.unit_price)]));

        let grandTotal = 0;
        const items = rows.map((row) => {
            const unitPrice = priceById.get(row.id) ?? 0;
            const value = row.on_hand * unitPrice;
            grandTotal += value;
            return { ...row, unit_price: unitPrice, value };
        });
        return { items, grandTotal };
    }

    /** Per-item sum of (quantity - fulfilled_quantity) across open Sales Order lines - stock promised but not yet shipped. */
    async getCommittedStockReport(orgId) {
        const { SalesOrder, SalesOrderLineItem, InventoryItem } = this.models;
        const lines = await SalesOrderLineItem.findAll({
            where: { org_id: orgId },
            include: [
                { model: SalesOrder, as: 'salesOrder', required: true, where: { status: ['pending', 'partially_fulfilled'] } },
                { model: InventoryItem, as: 'item', required: true },
            ],
        });

        const committedByItem = new Map();
        for (const line of lines) {
            const remaining = toNumber(line.quantity) - toNumber(line.fulfilled_quantity);
            if (remaining <= 0) continue;
            const key = line.item_id;
            const existing = committedByItem.get(key) ?? { id: line.item.id, sku: line.item.sku, name: line.item.name, committed: 0 };
            existing.committed += remaining;
            committedByItem.set(key, existing);
        }
        return [...committedByItem.values()].sort((a, b) => a.name.localeCompare(b.name));
    }

    async _serializeListItem(item) {
        const json = item.toJSON();
        const onHand = (json.stockLevels ?? []).reduce((sum, row) => sum + toNumber(row.quantity), 0);
        const front_image_url = await this.s3Service.getSignedDownloadUrl(json.front_image_key);
        return { ...json, on_hand: onHand, front_image_url };
    }
}

export default ItemService;
