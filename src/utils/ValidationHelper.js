import { validationResult } from 'express-validator';
import { AppError } from '../errors/index.js';
import { ErrorCode } from '../errors/ErrorCode.js';

/**
 * Throws an AppError if express-validator found any validation errors
 * on the request. Call this at the top of a controller after the
 * route's validation rule chain has run.
 */
const ValidationHelper = {
    check(req) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new AppError(
                'Validation failed',
                400,
                ErrorCode.VALIDATION_ERROR,
                errors.array().map((e) => ({ field: e.path, message: e.msg }))
            );
        }
    },
};

export default ValidationHelper;
