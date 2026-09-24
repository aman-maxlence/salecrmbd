const path = require('path');

const nodeEnv = process.env.NODE_ENV || 'development';

const envFolderMap = {
    development: 'dev',
    staging: 'staging',
    production: 'prod',
};

const envFilePath = path.resolve(
    process.cwd(),
    'environments',
    envFolderMap[nodeEnv],
    '.env'
);

require('dotenv').config({ path: envFilePath });

console.log('🔹 Sequelize CLI loaded env:', envFilePath);

// Same DB_SSL toggle the app's own runtime connection (Database.js) uses -
// TiDB Cloud (and most managed MySQL) requires TLS, which sequelize-cli's
// own config never enabled before, so `db:migrate` would fail to even
// connect against it despite the running app connecting fine.
const sslOptions = process.env.DB_SSL === 'true'
    ? { dialectOptions: { ssl: { rejectUnauthorized: false } } }
    : {};

module.exports = {
    development: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        timezone: '+00:00',
        logging: false,
        ...sslOptions,
    },
    staging: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        timezone: '+00:00',
        logging: false,
        ...sslOptions,
    },
    production: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        timezone: '+00:00',
        logging: false,
        ...sslOptions,
    },
};
