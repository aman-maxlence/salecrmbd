import { Logger } from '../utils/index.js';
import { AppError } from '../errors/index.js';

/**
 * Global Error Handler Middleware
 */
export const ErrorHandler = (err, req, res, next) => {
    Logger.error('Error caught by handler:', {
        message: err.message,
        code: err.code,
        statusCode: err.statusCode,
        details: err.details,
        stack: err.stack,
    });

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
            statusCode: err.statusCode,
            details: err.details,
            timestamp: err.timestamp,
        });
    }

    if (err.array && typeof err.array === 'function') {
        const errors = err.array();
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            details: errors.map((e) => ({ field: e.param, message: e.msg })),
        });
    }

    return res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        code: 'INTERNAL_ERROR',
        statusCode: 500,
    });
};

export default ErrorHandler;
