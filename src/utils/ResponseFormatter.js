/**
 * Response Formatter - Consistent API response format
 */
const ResponseFormatter = {
    success(message = 'Success', data = {}, statusCode = 200) {
        return {
            success: true,
            message,
            statusCode,
            data,
            timestamp: new Date().toISOString(),
        };
    },

    error(message = 'Error', code = 'ERROR', statusCode = 500, details = {}) {
        return {
            success: false,
            message,
            code,
            statusCode,
            details,
            timestamp: new Date().toISOString(),
        };
    },

    paginated(data = [], page = 1, limit = 10, total = 0, message = 'Success') {
        return {
            success: true,
            message,
            statusCode: 200,
            data,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            timestamp: new Date().toISOString(),
        };
    },
};

export default ResponseFormatter;
