import crypto from 'crypto';
import config from '../config/config.js';

const ALGORITHM = 'aes-256-gcm';
// Derived once from JWT_SECRET rather than a separate env var - this is an
// internal-at-rest encryption key (integration OAuth tokens), not a
// cross-service secret like JWT_SECRET itself, so reusing it avoids adding
// yet another required env var for a first pass.
const KEY = crypto.scryptSync(config.JWT_SECRET, 'salecrm-integrations', 32);

/**
 * AES-256-GCM encrypt/decrypt for OAuth access/refresh tokens at rest
 * (Integration Setup checklist - tokens must not sit in the database in
 * plaintext). Output is a single string: `<ivHex>:<authTagHex>:<cipherHex>`.
 */
const CryptoHelper = {
    encrypt(plaintext) {
        if (plaintext === null || plaintext === undefined) return null;
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
        const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    },

    decrypt(payload) {
        if (!payload) return null;
        try {
            const [ivHex, authTagHex, dataHex] = payload.split(':');
            const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
            decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
            const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
            return decrypted.toString('utf8');
        } catch {
            return null;
        }
    },
};

export default CryptoHelper;
