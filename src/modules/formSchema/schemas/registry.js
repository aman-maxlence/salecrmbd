import { ENTITY_TYPE as INVENTORY_ITEM_ENTITY_TYPE, INVENTORY_ITEM_SCHEMA } from './inventoryItemSchema.js';

/**
 * Every entity type this engine knows how to seed a default form for.
 * Adding a new module = adding one entry here (plus wiring that module's
 * own service to call FormSchemaService.ensureDefaultSchema/validateValues/
 * saveValuesForEntity, same as ItemService does for 'inventory_item').
 */
export const SCHEMA_REGISTRY = {
    [INVENTORY_ITEM_ENTITY_TYPE]: INVENTORY_ITEM_SCHEMA,
};

export const ENTITY_TYPES = Object.keys(SCHEMA_REGISTRY);

export default SCHEMA_REGISTRY;
