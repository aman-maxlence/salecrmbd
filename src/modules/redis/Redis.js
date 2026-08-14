import { createClient } from 'redis';
import config from '../../config/config.js';
import Logger from '../../utils/Logger.js';

let redisClient = null;

export const Redis = {
    async connect() {
        try {
            Logger.info('Connecting to Redis...');

            redisClient = createClient({
                username: config.redis.username,
                password: config.redis.password,
                socket: {
                    host: config.redis.host,
                    port: config.redis.port,
                    tls: config.redis.tls,
                },
            });

            redisClient.on('error', (err) => Logger.error('Redis Client Error:', err.message));
            redisClient.on('ready', () => Logger.info('Redis Client Ready'));
            redisClient.on('reconnecting', () => Logger.warn('Redis Client Reconnecting'));
            redisClient.on('connect', () => Logger.info('Redis connection established'));

            await redisClient.connect();
            return redisClient;
        } catch (error) {
            Logger.error('Redis connection failed:', error.message);
            throw error;
        }
    },

    getClient() {
        if (!redisClient) {
            throw new Error('Redis client not initialized. Call connect() first.');
        }
        return redisClient;
    },

    async disconnect() {
        try {
            if (redisClient) {
                await redisClient.quit();
                Logger.info('Redis connection closed');
            }
        } catch (error) {
            Logger.error('Failed to close Redis connection:', error.message);
        }
    },
};

export default Redis;
