/**
 * Error class for application errors
 */
export class AppError extends Error {
    /**
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {string} code - Error code identifier
     * @param {*} [details] - Additional error details
     */
    constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            success: false,
            error: {
                code: this.code,
                message: this.message,
                statusCode: this.statusCode,
                ...(this.details && { details: this.details }),
                timestamp: this.timestamp,
            },
        };
    }
}

export default AppError;
