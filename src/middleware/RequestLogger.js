import { Logger } from '../utils/index.js';

export const RequestLogger = (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        Logger.info('HTTP Request', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?.id || 'anonymous',
        });
    });

    next();
};

export default RequestLogger;
