const config = {
    app: {
        port: process.env.PORT || 3003,
        env: process.env.NODE_ENV || 'development',
        name: 'Sale CRM',
        publicBaseUrl: process.env.APP_PUBLIC_URL || `http://localhost:${process.env.PORT || 3003}`,
    },

    // CORS configuration
    cors: {
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
        credentials: true,
    },

    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'maxlence_salecrm',
        dialect: 'mysql',
        logging: process.env.LOG_LEVEL === 'debug' ? console.log : false,
        timezone: '+00:00',
        ssl: process.env.DB_SSL === 'true',
        syncForce: process.env.DB_SYNC_FORCE === 'true',
        syncAlter: process.env.DB_SYNC_ALTER === 'true',
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },

    // JWT Configuration - MUST match the secret used by userbd, since tokens
    // are issued there and only verified here.
    JWT_SECRET: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production_12345678',
    JWT_EXPIRY: process.env.JWT_EXPIRY || '1h',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your_refresh_token_secret_change_in_production_87654321',
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

    // Redis Configuration - MUST point at the same Redis instance userbd
    // writes session data to (users:<id> keys), or auth lookups will fail.
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        username: process.env.REDIS_USERNAME || 'default',
        password: process.env.REDIS_PASSWORD || '',
        tls: process.env.REDIS_TLS === 'true',
    },

    // User Service (central auth/org/billing/product registry)
    userService: {
        apiToken: process.env.USER_SERVICE_API_TOKEN || '',
        url: process.env.USER_SERVICE_URL || 'http://host.docker.internal:3001',
    },

    webhook: {
        secret: process.env.USER_SERVICE_WEBHOOK_SECRET || '',
    },

    emailConfig: {
        MAILER_USER: process.env.MAILER_USER || '',
        MAILER_PASS: process.env.MAILER_PASS || '',
        SHELL_FRONTEND_URL: process.env.SHELL_FRONTEND_URL || 'http://localhost:5173',
        SALE_CRM_FRONTEND_URL: process.env.SALE_CRM_FRONTEND_URL || 'http://localhost:5175',
        SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@maxlence.com',
    },

    // DigitalOcean Spaces (S3-compatible) - workspace logo uploads.
    // Deliberately a separate bucket/account from maxpmbd's, not shared -
    // fill these in via environments/<env>/.env before logo upload will work.
    s3: {
        endpoint: process.env.DIGITALOCEAN_ENDPOINT || 'https://syd1.digitaloceanspaces.com',
        region: process.env.DIGITALOCEAN_REGION || 'syd1',
        accessKeyId: process.env.DIGITALOCEAN_ACCESS_KEY || '',
        secretAccessKey: process.env.DIGITALOCEAN_SECRET_KEY || '',
        bucket: process.env.DIGITALOCEAN_BUCKET_NAME || '',
        maxFileSize: 5 * 1024 * 1024,
        uploadUrlExpiry: 900,
        downloadUrlExpiry: 604800,
    },

    // Product identity - "Sales CRM" is already seeded as product id 2 in
    // userbd/scripts/seedProductsAndPlans.js (2nd product after Project
    // Management) and hardcoded as `id: 2` in userpmfe's ProductSelectionPage.
    // Confirm `2` against the live `products` table before relying on it in prod.
    productId: process.env.PRODUCT_ID || '2',
};

export default config;
