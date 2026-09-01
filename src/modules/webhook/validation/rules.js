import { body, validationResult } from 'express-validator';
import { AppError } from '../../../errors/index.js';

export const adminSetupValidation = [
    body('userId').notEmpty().withMessage('userId is required').isInt({ min: 1 }),
    body('orgId').notEmpty().withMessage('orgId is required').isInt({ min: 1 }),
    body('event').trim().notEmpty().equals('SETUP_ADMIN_USER'),
];

export const inviteAcceptanceValidation = [
    body('userId').notEmpty().withMessage('userId is required').isInt({ min: 1 }),
    body('orgId').notEmpty().withMessage('orgId is required').isInt({ min: 1 }),
    body('emailId').notEmpty().isEmail(),
    body('event').trim().notEmpty().equals('USER_INVITE_ACCEPTED'),
    body('timestamp').trim().notEmpty().isISO8601(),
];

export const inviteLinkJoinedValidation = [
    body('userId').notEmpty().withMessage('userId is required').isInt({ min: 1 }),
    body('orgId').notEmpty().withMessage('orgId is required').isInt({ min: 1 }),
    body('emailId').notEmpty().isEmail(),
    body('linkToken').trim().notEmpty().withMessage('linkToken is required'),
    body('event').trim().notEmpty().equals('ORG_INVITE_LINK_JOINED'),
    body('timestamp').trim().notEmpty().isISO8601(),
];

export const handleWebhookValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formatted = errors.array().map((e) => ({ field: e.param, message: e.msg, value: e.value }));
        const validationError = new AppError('Webhook validation failed', 400, 'WEBHOOK_VALIDATION_ERROR', {
            fields: formatted,
            count: formatted.length,
        });
        return res.status(validationError.statusCode).json({
            success: false,
            error: validationError.code,
            message: validationError.message,
            statusCode: validationError.statusCode,
            data: validationError.details,
        });
    }
    next();
};

export default { adminSetupValidation, inviteAcceptanceValidation, inviteLinkJoinedValidation, handleWebhookValidationErrors };
