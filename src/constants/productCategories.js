/**
 * Mirrors salecrmfe's PRODUCT_CATEGORY_OPTIONS (src/modules/settings/constants/companyOptions.ts)
 * label-for-label, so a category picked in Business Preferences becomes a
 * genuinely readable Inventory item-category name, not a raw key like
 * "software_saas" (see BusinessPreferencesService._syncItemCategories).
 */
export const PRODUCT_CATEGORY_LABELS = {
    software_saas: 'Software / SaaS',
    consulting: 'Consulting Services',
    physical_goods: 'Physical Goods / Hardware',
    professional_services: 'Professional Services',
    financial_services: 'Financial Services',
    healthcare_services: 'Healthcare Services',
    education_training: 'Education / Training',
    retail_ecommerce: 'Retail / E-commerce',
    manufacturing: 'Manufacturing',
    other: 'Other',
};

export default PRODUCT_CATEGORY_LABELS;
