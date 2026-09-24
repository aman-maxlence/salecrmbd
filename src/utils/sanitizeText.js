/**
 * Strips any HTML tags from a plain-text field before it's persisted.
 * Cheap insurance for free-text fields (name, job title, company name,
 * invitee name) that only get type/length validation today - React already
 * escapes on render so there's no active stored-XSS path in this app right
 * now, but this removes the risk entirely rather than relying on every
 * future consumer (an email template, a PDF export, a non-React surface)
 * to also escape correctly. Unlike the rich-text field type (sanitize-html,
 * which allows a safe tag subset), these fields never need any markup at all.
 */
export function stripTags(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/<[^>]*>/g, '').trim();
}

export default stripTags;
