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
    },
};
