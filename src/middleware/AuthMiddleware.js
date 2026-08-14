import { Logger } from '../utils/index.js';
import { AppError, ErrorCode } from '../errors/index.js';
import { TokenHelper } from '../utils/index.js';
import { CookieNames } from '../constants/enums.js';
import { Redis } from '../modules/redis/Redis.js';

/**
 * Verifies the shared platform session cookie and looks the user up in the
 * shared Redis cache (populated by userbd at login: key `users:<id>`).
 * This service never issues tokens itself - only userbd does.
 */
export const AuthMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies[CookieNames.ACCESS_TOKEN];

        if (!token) {
            Logger.warn('Access token missing from cookies');
            throw new AppError('Access token missing. Please login.', 401, ErrorCode.TOKEN_NOT_FOUND);
        }

        const decoded = TokenHelper.verifyToken(token);

        if (!decoded) {
            Logger.warn('Invalid or expired access token');
            throw new AppError('Invalid or expired token', 401, ErrorCode.INVALID_TOKEN);
        }

        const redisClient = Redis.getClient();
        const userId = decoded.id || decoded.userId;

        const key = `users:${userId}`;
        const userData = await redisClient.get(key);

        if (!userData) {
            Logger.warn(`User info not found in Redis for userId: ${userId}`);
            throw new AppError('User session expired. Please login again.', 401, ErrorCode.UNAUTHORIZED);
        }

        req.user = JSON.parse(userData);
        req.userId = userId;

        Logger.info(`User authenticated: ${userId}`);
        next();
    } catch (error) {
        Logger.error('Auth middleware error:', error.message);
        if (error instanceof AppError) {
            return res.status(error.statusCode).json(error.toJSON());
        }
        return res.status(401).json({
            success: false,
            message: 'Authentication failed',
            code: ErrorCode.INVALID_TOKEN,
        });
    }
};

export default AuthMiddleware;
