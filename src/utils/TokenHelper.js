import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import Logger from './Logger.js';

/**
 * Token Helper - JWT operations.
 * Verification only in this service; tokens are issued by userbd.
 */
const TokenHelper = {
    verifyToken(token) {
        try {
            return jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
        } catch (error) {
            Logger.error('Token verification failed:', error.message);
            return null;
        }
    },

    verifyRefreshToken(token) {
        try {
            return jwt.verify(token, config.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
        } catch (error) {
            Logger.error('Refresh token verification failed:', error.message);
            return null;
        }
    },

    decodeToken(token) {
        try {
            return jwt.decode(token);
        } catch (error) {
            Logger.error('Error decoding token:', error);
            return null;
        }
    },
};

export default TokenHelper;
