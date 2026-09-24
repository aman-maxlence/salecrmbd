/**
 * Generic, entity-agnostic form-schema engine - governs the *layout* of any
 * module's data-entry form (sections, headings/descriptions, ordering, and
 * a field/section's visibility depending on another field's value), plus
 * genuinely admin-defined custom fields (EAV-stored). It deliberately does
 * NOT own the *value* of a built-in field (e.g. InventoryItem.sku) - that
 * still lives on the entity's own real column with its own existing
 * business logic (uniqueness, price history, etc.); this engine only
 * describes where that field sits on the form and whether it's currently
 * shown, so adopting it for a new module never requires moving existing
 * validated data into EAV.
 */
export const FORM_FIELD_TYPES = [
    'text', 'textarea', 'number', 'date', 'boolean', 'select', 'radio', 'checkbox', 'email', 'url',
    'text_editor', 'image', 'other_text',
];

// 'other_text' also needs a fixed choice list, same as select/radio - it's
// those choices PLUS an implicit "Other" option that reveals a free-text
// box (see FormSchemaService._validateValue's 'other_text' case).
export const FORM_FIELD_OPTION_TYPES = ['select', 'radio', 'checkbox', 'other_text'];

export const OTHER_TEXT_SENTINEL = '__other__';

export const VISIBILITY_OPERATORS = ['equals', 'not_equals', 'in', 'not_in'];

export default { FORM_FIELD_TYPES, FORM_FIELD_OPTION_TYPES, VISIBILITY_OPERATORS };
