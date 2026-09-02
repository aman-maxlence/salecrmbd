import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import config from '../config/config.js';
import Logger from './Logger.js';
import AppError from '../errors/AppError.js';
import { ErrorCode } from '../errors/index.js';

/**
 * DigitalOcean Spaces (S3-compatible) uploads, scoped to workspace branding
 * for now (logo). Mirrors maxpmbd's src/services/s3UploadService.js pattern -
 * presigned PUT for the browser to upload directly, DB stores only the key,
 * a signed GET is minted on read.
 */
export class S3UploadService {
    constructor() {
        this.s3Client = new S3Client({
            region: config.s3.region,
            endpoint: config.s3.endpoint,
            credentials: {
                accessKeyId: config.s3.accessKeyId,
                secretAccessKey: config.s3.secretAccessKey,
            },
            forcePathStyle: true, // required for DigitalOcean Spaces
        });

        this.bucket = config.s3.bucket;
        this.maxFileSize = config.s3.maxFileSize;
        this.uploadUrlExpiry = config.s3.uploadUrlExpiry || 900;
        this.downloadUrlExpiry = config.s3.downloadUrlExpiry || 604800;
    }

    async getSignedUploadUrl(key, contentType, allowedMimeTypes = null) {
        if (allowedMimeTypes && allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(contentType)) {
            throw new AppError(
                `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
                400,
                ErrorCode.VALIDATION_ERROR
            );
        }

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: this.uploadUrlExpiry });

        Logger.info(`[S3UploadService] Generated presigned upload URL for: ${key}`);

        return { uploadUrl, key, expiresIn: this.uploadUrlExpiry };
    }

    /** Accepts either a raw S3 key or an already-full URL (e.g. a legacy pasted logo URL) - passes the latter through unchanged. */
    async getSignedDownloadUrl(key) {
        if (!key) return null;
        if (key.startsWith('http://') || key.startsWith('https://')) return key;

        try {
            const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
            return await getSignedUrl(this.s3Client, command, { expiresIn: this.downloadUrlExpiry });
        } catch (error) {
            Logger.error('[S3UploadService] Error generating download URL:', error.message);
            throw error;
        }
    }

    async deleteFile(key) {
        if (!key || key.startsWith('http://') || key.startsWith('https://')) return;
        try {
            await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
            Logger.info(`[S3UploadService] Deleted from S3: ${key}`);
        } catch (error) {
            Logger.error('[S3UploadService] Error deleting file:', error.message);
            throw error;
        }
    }

    /**
     * @example generateS3Key(14, 'workspace-logo', 'logo.png') -> "workspace-logo/org-14/1770604983960-abc123.png"
     */
    generateS3Key(orgId, folder, filename) {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const fileExtension = filename.split('.').pop();
        return `${folder}/org-${orgId}/${timestamp}-${randomId}.${fileExtension}`;
    }

    async getSignedUploadUrlForWorkspaceLogo(orgId, filename, contentType) {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
        const key = this.generateS3Key(orgId, 'workspace-logo', filename);
        return this.getSignedUploadUrl(key, contentType, allowedMimeTypes);
    }

    async verify() {
        Logger.info(`Connecting to storage bucket: ${this.bucket} (${config.s3.endpoint})`);
        try {
            await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
            Logger.info(`Storage bucket connected: ${this.bucket}`);
        } catch (error) {
            const status = error.$metadata?.httpStatusCode;
            if (status === 403) {
                Logger.warn(`Storage bucket access denied (403) - check credentials for bucket: ${this.bucket}`);
            } else if (status === 404) {
                Logger.warn(`Storage bucket not found (404): ${this.bucket}`);
            } else {
                Logger.warn(`Storage bucket check failed: ${error.message}`);
            }
        }
    }
}

export default S3UploadService;
