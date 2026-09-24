import sanitizeHtml from 'sanitize-html';
import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { toNumber } from '../../../constants/inventory.js';
import { FORM_FIELD_TYPES, FORM_FIELD_OPTION_TYPES, VISIBILITY_OPERATORS, OTHER_TEXT_SENTINEL } from '../constants.js';
import { SCHEMA_REGISTRY } from '../schemas/registry.js';
import S3UploadService from '../../../utils/S3UploadService.js';

const TEXT_EDITOR_MAX_LENGTH = 20000;

// Deliberately conservative - this is admin/user-authored rich text stored
// once and re-rendered to every viewer later, so anything script-capable
// (script tags, on* attributes, javascript: URLs) is stripped rather than
// trusted, regardless of who submitted it.
const TEXT_EDITOR_SANITIZE_OPTIONS = {
    allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'blockquote', 'code', 'pre'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
        a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
};

function slugify(label) {
    return label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 100) || 'field';
}

/**
 * Generic form-schema engine shared by every module that opts in (today:
 * Inventory's Item form - see formSchema/schemas/inventoryItemSchema.js).
 * Owns the section/field *layout* for any entity_type, plus full CRUD/
 * validation for genuinely custom (non-builtin) fields' values. Built-in
 * fields' values are never touched here - only their label/required/
 * visible/position/section/visibility_rule metadata is.
 */
class FormSchemaService {
    constructor(models) {
        this.models = models;
        this.s3Service = new S3UploadService();
    }

    /** Presigned upload for a custom 'image' field's value - any viewer who can fill the form, not just whoever built it (see formSchemaRoutes.js's `view` gate on this endpoint). */
    async getImageFieldPresignedUrl(orgId, filename, contentType) {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const key = this.s3Service.generateS3Key(orgId, 'form-field-image', filename);
        return this.s3Service.getSignedUploadUrl(key, contentType, allowedMimeTypes);
    }

    _assertKnownEntityType(entityType) {
        if (!SCHEMA_REGISTRY[entityType]) {
            throw new AppError(`Unknown entity type "${entityType}".`, 400, ErrorCode.VALIDATION_ERROR);
        }
    }

    /**
     * Idempotent - only seeds if this org has never had a schema for this
     * entity_type. Creates one real FormSection per registry entry (in
     * order) and seeds each of its builtin fields straight into that
     * section, so a brand-new org's form isn't empty - an admin can still
     * rename/reorder/hide any of it, or add their own sections/fields,
     * from Settings -> Form Builder afterwards.
     */
    async ensureDefaultSchema(orgId, entityType) {
        this._assertKnownEntityType(entityType);
        const { FormSection, FormFieldDefinition } = this.models;
        const existing = await FormFieldDefinition.count({ where: { org_id: orgId, entity_type: entityType } });
        if (existing > 0) return;

        let sectionPosition = 0;
        for (const sectionSeed of SCHEMA_REGISTRY[entityType]) {
            const section = await FormSection.create({
                org_id: orgId,
                entity_type: entityType,
                parent_section_id: null,
                heading: sectionSeed.heading ?? null,
                description: sectionSeed.description ?? null,
                position: sectionPosition++,
                visibility_rule: sectionSeed.visibilityRule ?? null,
            });

            for (const fieldSeed of sectionSeed.fields) {
                await FormFieldDefinition.create({
                    org_id: orgId,
                    entity_type: entityType,
                    section_id: section.id,
                    field_key: fieldSeed.fieldKey,
                    label: fieldSeed.label,
                    field_type: fieldSeed.fieldType,
                    required: Boolean(fieldSeed.required),
                    visible: true,
                    position: fieldSeed.position ?? 0,
                    options: fieldSeed.options ?? null,
                    visibility_rule: fieldSeed.visibilityRule ?? null,
                    is_builtin: true,
                });
            }
        }
    }

    /** Nested tree: each section carries `.fields` (ordered) and `.children` (sub-sections). */
    async getSchema(orgId, entityType) {
        this._assertKnownEntityType(entityType);
        await this.ensureDefaultSchema(orgId, entityType);
        const { FormSection, FormFieldDefinition } = this.models;

        const [sections, fields] = await Promise.all([
            FormSection.findAll({ where: { org_id: orgId, entity_type: entityType }, order: [['position', 'ASC'], ['id', 'ASC']] }),
            FormFieldDefinition.findAll({ where: { org_id: orgId, entity_type: entityType }, order: [['position', 'ASC'], ['id', 'ASC']] }),
        ]);

        const fieldsBySection = new Map();
        for (const f of fields) {
            if (!fieldsBySection.has(f.section_id)) fieldsBySection.set(f.section_id, []);
            fieldsBySection.get(f.section_id).push(f);
        }

        const nodesById = new Map(sections.map((s) => [s.id, { ...s.toJSON(), fields: fieldsBySection.get(s.id) ?? [], children: [] }]));
        const roots = [];
        for (const node of nodesById.values()) {
            if (node.parent_section_id && nodesById.has(node.parent_section_id)) {
                nodesById.get(node.parent_section_id).children.push(node);
            } else {
                roots.push(node);
            }
        }
        return roots;
    }

    // ==================== SECTIONS ====================

    async createSection(orgId, entityType, payload) {
        this._assertKnownEntityType(entityType);
        const { FormSection } = this.models;

        let parentSectionId = null;
        if (payload.parentSectionId) {
            const parent = await FormSection.findOne({ where: { id: payload.parentSectionId, org_id: orgId, entity_type: entityType } });
            if (!parent) throw new AppError('Parent section not found.', 404, ErrorCode.NOT_FOUND);
            parentSectionId = parent.id;
        }

        const maxPosition = await FormSection.max('position', { where: { org_id: orgId, entity_type: entityType, parent_section_id: parentSectionId } });
        return FormSection.create({
            org_id: orgId,
            entity_type: entityType,
            parent_section_id: parentSectionId,
            heading: payload.heading?.trim() || null,
            description: payload.description?.trim() || null,
            position: Number.isFinite(maxPosition) ? maxPosition + 1 : 0,
            visibility_rule: this._normalizeRule(payload.visibilityRule),
        });
    }

    async updateSection(orgId, id, payload) {
        const { FormSection } = this.models;
        const section = await FormSection.findOne({ where: { id, org_id: orgId } });
        if (!section) throw new AppError('Section not found.', 404, ErrorCode.NOT_FOUND);

        if (payload.heading !== undefined) section.heading = payload.heading?.trim() || null;
        if (payload.description !== undefined) section.description = payload.description?.trim() || null;
        if (payload.visibilityRule !== undefined) section.visibility_rule = this._normalizeRule(payload.visibilityRule);
        await section.save();
        return section;
    }

    async deleteSection(orgId, id) {
        const { FormSection, FormFieldDefinition } = this.models;
        const section = await FormSection.findOne({ where: { id, org_id: orgId } });
        if (!section) throw new AppError('Section not found.', 404, ErrorCode.NOT_FOUND);

        const builtinCount = await FormFieldDefinition.count({ where: { org_id: orgId, section_id: id, is_builtin: true } });
        if (builtinCount > 0) {
            throw new AppError('This section still has built-in fields - move them to another section first (built-in fields can only be hidden, not deleted).', 409, ErrorCode.CONFLICT);
        }
        const childCount = await FormSection.count({ where: { org_id: orgId, parent_section_id: id } });
        if (childCount > 0) {
            throw new AppError('This section still has sub-sections - remove those first.', 409, ErrorCode.CONFLICT);
        }

        await FormFieldDefinition.destroy({ where: { org_id: orgId, section_id: id } });
        await section.destroy();
    }

    /** `orderedIds` is every section id for this (org, entityType), flat, in the desired new order. */
    async reorderSections(orgId, entityType, orderedIds) {
        const { FormSection } = this.models;
        return this._reorder(FormSection, { org_id: orgId, entity_type: entityType }, orderedIds);
    }

    // ==================== FIELDS ====================

    /**
     * Creates a genuinely custom (is_builtin: false) field - UNLESS the key
     * typed matches a builtin field that's still unassigned (see
     * ensureDefaultSchema), in which case "adding" it here means placing
     * that already-existing field into this section, not creating a second
     * field with the same key (which the unique index would reject anyway).
     */
    async createField(orgId, entityType, payload) {
        this._assertKnownEntityType(entityType);
        const { FormFieldDefinition, FormSection } = this.models;

        const label = payload.label?.trim();
        if (!label) throw new AppError('Field label is required.', 400, ErrorCode.VALIDATION_ERROR);
        if (!payload.sectionId) throw new AppError('A section is required.', 400, ErrorCode.VALIDATION_ERROR);

        const section = await FormSection.findOne({ where: { id: payload.sectionId, org_id: orgId, entity_type: entityType } });
        if (!section) throw new AppError('Section not found.', 404, ErrorCode.NOT_FOUND);

        const fieldKey = payload.fieldKey?.trim() ? slugify(payload.fieldKey) : slugify(label);
        const clash = await FormFieldDefinition.findOne({ where: { org_id: orgId, entity_type: entityType, field_key: fieldKey } });
        if (clash) {
            if (!clash.is_builtin || clash.section_id !== null) {
                throw new AppError(`A field with key "${fieldKey}" already exists.`, 409, ErrorCode.CONFLICT);
            }
            const maxPosition = await FormFieldDefinition.max('position', { where: { org_id: orgId, entity_type: entityType, section_id: section.id } });
            clash.section_id = section.id;
            clash.label = label;
            clash.position = Number.isFinite(maxPosition) ? maxPosition + 1 : 0;
            if (payload.required !== undefined) clash.required = Boolean(payload.required);
            if (payload.visible !== undefined) clash.visible = Boolean(payload.visible);
            if (payload.visibilityRule !== undefined) clash.visibility_rule = this._normalizeRule(payload.visibilityRule);
            await clash.save();
            return clash;
        }

        const fieldType = payload.fieldType;
        if (!FORM_FIELD_TYPES.includes(fieldType)) {
            throw new AppError(`Field type must be one of: ${FORM_FIELD_TYPES.join(', ')}.`, 400, ErrorCode.VALIDATION_ERROR);
        }
        const options = this._normalizeOptions(fieldType, payload.options);

        const maxPosition = await FormFieldDefinition.max('position', { where: { org_id: orgId, entity_type: entityType, section_id: section.id } });

        return FormFieldDefinition.create({
            org_id: orgId,
            entity_type: entityType,
            section_id: section.id,
            field_key: fieldKey,
            label,
            field_type: fieldType,
            required: Boolean(payload.required),
            visible: payload.visible !== false,
            position: Number.isFinite(maxPosition) ? maxPosition + 1 : 0,
            options,
            visibility_rule: this._normalizeRule(payload.visibilityRule),
            is_builtin: false,
        });
    }

    /** Built-in rows: only label/required/visible/section/position/visibility_rule may change - never field_type or field_key. */
    async updateField(orgId, id, payload) {
        const { FormFieldDefinition, FormSection } = this.models;
        const field = await FormFieldDefinition.findOne({ where: { id, org_id: orgId } });
        if (!field) throw new AppError('Field not found.', 404, ErrorCode.NOT_FOUND);

        if (field.is_builtin && (payload.fieldType !== undefined || payload.fieldKey !== undefined)) {
            throw new AppError('Built-in fields can\'t change type or key - only label, required, visibility, section, and order.', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (!field.is_builtin && payload.fieldType !== undefined) {
            if (!FORM_FIELD_TYPES.includes(payload.fieldType)) {
                throw new AppError(`Field type must be one of: ${FORM_FIELD_TYPES.join(', ')}.`, 400, ErrorCode.VALIDATION_ERROR);
            }
            field.field_type = payload.fieldType;
        }

        if (payload.label !== undefined) {
            if (!payload.label?.trim()) throw new AppError('Field label is required.', 400, ErrorCode.VALIDATION_ERROR);
            field.label = payload.label.trim();
        }
        if (payload.options !== undefined || payload.fieldType !== undefined) {
            field.options = this._normalizeOptions(field.field_type, payload.options !== undefined ? payload.options : field.options);
        }
        if (payload.required !== undefined) field.required = Boolean(payload.required);
        if (payload.visible !== undefined) field.visible = Boolean(payload.visible);
        if (payload.visibilityRule !== undefined) field.visibility_rule = this._normalizeRule(payload.visibilityRule);
        if (payload.sectionId !== undefined) {
            if (payload.sectionId === null) {
                field.section_id = null;
            } else {
                const section = await FormSection.findOne({ where: { id: payload.sectionId, org_id: orgId, entity_type: field.entity_type } });
                if (!section) throw new AppError('Section not found.', 404, ErrorCode.NOT_FOUND);
                field.section_id = section.id;
            }
        }

        await field.save();
        return field;
    }

    /** Built-in rows can never be deleted (there's a real column behind them) - only hidden via `visible: false`. */
    async deleteField(orgId, id) {
        const { FormFieldDefinition, FormFieldValue } = this.models;
        const field = await FormFieldDefinition.findOne({ where: { id, org_id: orgId } });
        if (!field) throw new AppError('Field not found.', 404, ErrorCode.NOT_FOUND);
        if (field.is_builtin) {
            throw new AppError('Built-in fields can\'t be deleted - turn off "Visible" instead.', 409, ErrorCode.CONFLICT);
        }
        await FormFieldValue.destroy({ where: { field_id: id } });
        await field.destroy();
    }

    /** `orderedIds` is every field id within one section, in the desired new order. */
    async reorderFields(orgId, sectionId, orderedIds) {
        const { FormFieldDefinition } = this.models;
        return this._reorder(FormFieldDefinition, { org_id: orgId, section_id: sectionId }, orderedIds);
    }

    async _reorder(Model, scopeWhere, orderedIds) {
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            throw new AppError('orderedIds must be a non-empty array.', 400, ErrorCode.VALIDATION_ERROR);
        }
        const rows = await Model.findAll({ where: { ...scopeWhere, id: orderedIds } });
        if (rows.length !== orderedIds.length) {
            throw new AppError('One or more rows were not found in this scope.', 404, ErrorCode.NOT_FOUND);
        }
        const byId = new Map(rows.map((r) => [r.id, r]));
        await Promise.all(orderedIds.map((id, index) => {
            const row = byId.get(id);
            row.position = index;
            return row.save();
        }));
        return Model.findAll({ where: scopeWhere, order: [['position', 'ASC'], ['id', 'ASC']] });
    }

    // ==================== VISIBILITY ====================

    /** `contextValues` is a flat `{ fieldKey: value }` map - typically the submitted/current builtin field values. */
    isRuleSatisfied(rule, contextValues) {
        if (!rule) return true;
        const actual = contextValues?.[rule.fieldKey];
        switch (rule.operator) {
            case 'equals': return actual === rule.value;
            case 'not_equals': return actual !== rule.value;
            case 'in': return Array.isArray(rule.value) && rule.value.includes(actual);
            case 'not_in': return Array.isArray(rule.value) && !rule.value.includes(actual);
            default: return true;
        }
    }

    // ==================== CUSTOM FIELD VALUES (EAV) ====================

    /**
     * Validates `valuesByFieldId` (`{ [fieldId]: value }`) against every
     * visible *custom* field's required/type rules and returns the
     * normalized `Map<fieldId, value>` - no DB writes. Call this before
     * writing the entity's own row, so a bad value fails the whole request
     * instead of leaving a half-saved entity behind.
     */
    async validateValues(orgId, entityType, valuesByFieldId) {
        const { FormFieldDefinition } = this.models;
        const fields = await FormFieldDefinition.findAll({ where: { org_id: orgId, entity_type: entityType, is_builtin: false } });
        const submittedIds = new Set(Object.keys(valuesByFieldId ?? {}).map(Number));

        const normalizedByFieldId = new Map();
        for (const field of fields) {
            if (!field.visible || !submittedIds.has(field.id)) continue;
            normalizedByFieldId.set(field.id, this._validateValue(field, valuesByFieldId[field.id]));
        }
        return normalizedByFieldId;
    }

    async saveValuesForEntity(orgId, entityType, entityId, valuesByFieldId) {
        const { FormFieldValue } = this.models;
        const normalizedByFieldId = await this.validateValues(orgId, entityType, valuesByFieldId);

        for (const [fieldId, normalized] of normalizedByFieldId) {
            const [row] = await FormFieldValue.findOrCreate({
                where: { entity_type: entityType, entity_id: entityId, field_id: fieldId },
                defaults: { org_id: orgId, entity_type: entityType, entity_id: entityId, field_id: fieldId, value: normalized },
            });
            row.value = normalized;
            await row.save();
        }
    }

    /**
     * `{ [fieldKey]: boolean }` for the given builtin field_keys - true only
     * when that field is both visible and required, per whatever Settings ->
     * Form Builder currently has configured. Used by a module's own service
     * (e.g. ItemService) that still enforces required-ness on a handful of
     * its own builtin fields directly, rather than through the generic
     * validateValues/saveValuesForEntity path (which only ever concerns
     * itself with non-builtin, EAV-stored fields).
     */
    async getRequiredFlags(orgId, entityType, fieldKeys) {
        await this.ensureDefaultSchema(orgId, entityType);
        const { FormFieldDefinition } = this.models;
        const rows = await FormFieldDefinition.findAll({ where: { org_id: orgId, entity_type: entityType, field_key: fieldKeys } });
        const byKey = new Map(rows.map((r) => [r.field_key, r]));
        const result = {};
        for (const key of fieldKeys) {
            const row = byKey.get(key);
            result[key] = Boolean(row?.visible && row?.required);
        }
        return result;
    }

    async getValuesForEntity(orgId, entityType, entityId) {
        const { FormFieldValue, FormFieldDefinition } = this.models;
        const rows = await FormFieldValue.findAll({
            where: { org_id: orgId, entity_type: entityType, entity_id: entityId },
            include: [{ model: FormFieldDefinition, as: 'fieldDefinition', required: true }],
        });

        // 'image' fields store only the S3 key (see _validateValue) - resolve
        // it to a real, time-limited URL on the way out, same as
        // ItemService does for its own built-in image columns. Every other
        // field type's stored value is already display-ready as-is.
        return Promise.all(rows.map(async (row) => {
            if (row.fieldDefinition?.field_type !== 'image' || !row.value) return row;
            const plain = row.toJSON();
            plain.value = await this.s3Service.getSignedDownloadUrl(plain.value);
            return plain;
        }));
    }

    // ==================== INTERNAL ====================

    _normalizeOptions(fieldType, options) {
        if (!FORM_FIELD_OPTION_TYPES.includes(fieldType)) return null;
        const list = Array.isArray(options) ? options.map((o) => String(o).trim()).filter(Boolean) : [];
        if (list.length === 0) {
            throw new AppError(`At least one option is required for a "${fieldType}" field.`, 400, ErrorCode.VALIDATION_ERROR);
        }
        return list;
    }

    _normalizeRule(rule) {
        if (rule === undefined) return undefined;
        if (rule === null) return null;
        if (!rule.fieldKey || !VISIBILITY_OPERATORS.includes(rule.operator)) {
            throw new AppError(`A visibility rule needs a fieldKey and an operator (${VISIBILITY_OPERATORS.join(', ')}).`, 400, ErrorCode.VALIDATION_ERROR);
        }
        return { fieldKey: rule.fieldKey, operator: rule.operator, value: rule.value ?? null };
    }

    _validateValue(field, raw) {
        const isEmpty = raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0);
        if (field.required && isEmpty) {
            throw new AppError(`"${field.label}" is required.`, 400, ErrorCode.VALIDATION_ERROR);
        }
        if (isEmpty) return null;

        switch (field.field_type) {
            case 'number': {
                const n = toNumber(raw, NaN);
                if (!Number.isFinite(n)) throw new AppError(`"${field.label}" must be a number.`, 400, ErrorCode.VALIDATION_ERROR);
                return n;
            }
            case 'boolean':
                return Boolean(raw);
            case 'date': {
                const d = new Date(raw);
                if (Number.isNaN(d.getTime())) throw new AppError(`"${field.label}" must be a valid date.`, 400, ErrorCode.VALIDATION_ERROR);
                return d.toISOString();
            }
            case 'email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(raw))) {
                    throw new AppError(`"${field.label}" must be a valid email address.`, 400, ErrorCode.VALIDATION_ERROR);
                }
                return String(raw).trim();
            case 'url':
                try {
                    // eslint-disable-next-line no-new
                    new URL(String(raw));
                } catch {
                    throw new AppError(`"${field.label}" must be a valid URL.`, 400, ErrorCode.VALIDATION_ERROR);
                }
                return String(raw).trim();
            case 'select':
            case 'radio': {
                const options = field.options ?? [];
                if (!options.includes(raw)) {
                    throw new AppError(`"${field.label}" must be one of: ${options.join(', ')}.`, 400, ErrorCode.VALIDATION_ERROR);
                }
                return raw;
            }
            case 'checkbox': {
                const options = field.options ?? [];
                const values = Array.isArray(raw) ? raw : [raw];
                const invalid = values.filter((v) => !options.includes(v));
                if (invalid.length > 0) {
                    throw new AppError(`"${field.label}" contains an invalid choice: ${invalid.join(', ')}.`, 400, ErrorCode.VALIDATION_ERROR);
                }
                return values;
            }
            case 'text_editor': {
                const html = String(raw);
                if (html.length > TEXT_EDITOR_MAX_LENGTH) {
                    throw new AppError(`"${field.label}" is too long (max ${TEXT_EDITOR_MAX_LENGTH.toLocaleString()} characters).`, 400, ErrorCode.VALIDATION_ERROR);
                }
                return sanitizeHtml(html, TEXT_EDITOR_SANITIZE_OPTIONS);
            }
            case 'image': {
                // Only the S3 key is ever stored - the browser already
                // uploaded the actual file straight to storage via a
                // presigned URL (getImageFieldPresignedUrl) before this
                // field's value is ever submitted here.
                const key = String(raw).trim();
                if (!key) {
                    throw new AppError(`"${field.label}" must be a valid image.`, 400, ErrorCode.VALIDATION_ERROR);
                }
                return key;
            }
            case 'other_text': {
                const options = field.options ?? [];
                const choice = raw && typeof raw === 'object' ? raw.choice : raw;
                if (choice === OTHER_TEXT_SENTINEL) {
                    const otherText = (raw && typeof raw === 'object' ? raw.otherText : '')?.trim();
                    if (!otherText) {
                        throw new AppError(`Please specify a value for "${field.label}".`, 400, ErrorCode.VALIDATION_ERROR);
                    }
                    return { choice: OTHER_TEXT_SENTINEL, otherText };
                }
                if (!options.includes(choice)) {
                    throw new AppError(`"${field.label}" must be one of: ${options.join(', ')}, or Other.`, 400, ErrorCode.VALIDATION_ERROR);
                }
                return { choice, otherText: null };
            }
            case 'textarea':
            case 'text':
            default:
                return String(raw);
        }
    }
}

export default FormSchemaService;
