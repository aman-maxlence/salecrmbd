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

    // Every branch below nests under `error: {...}` - this MUST match
    // AppError.toJSON()'s shape exactly, since every client (salecrmfe's
    // getErrorMessage, and any other consumer of this API) reads
    // `response.data.error.message`. A flat `{message, code, ...}` body
    // (the bug this replaced) silently discarded every specific backend
    // error message app-wide - the client would always fall back to its
    // own generic "Something went wrong" text instead.
    if (err instanceof AppError) {
        return res.status(err.statusCode).json(err.toJSON());
    }

    if (err.array && typeof err.array === 'function') {
        const errors = err.array();
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                statusCode: 400,
                details: errors.map((e) => ({ field: e.param, message: e.msg })),
                timestamp: new Date().toISOString(),
            },
        });
    }

    return res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
            statusCode: 500,
            timestamp: new Date().toISOString(),
        },
    });
};

export default ErrorHandler;
