/**
 * Cookie names - must match the names userbd sets when it issues tokens,
 * since auth here only ever reads the cookie, never sets it.
 */
export const CookieNames = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    SESSION_ID: 'sessionId',
};

export const OrgRoleStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
};

export const PortalUserStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
};

export const TerritoryStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
};

// No 'expired' state: expiry/token ownership lives entirely in userbd's
// Invitation row (see InvitationService) - this local row only ever moves
// pending -> accepted/revoked, mirroring maxpmbd's Invitation status set.
export const InvitationStatus = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REVOKED: 'revoked',
};

export const OnboardingStatus = {
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
};

export const PermissionChangeType = {
    CREATE_ROLE: 'create_role',
    UPDATE_ROLE: 'update_role',
    UPDATE_PERMISSIONS: 'update_permissions',
    DELETE_ROLE: 'delete_role',
};

export default {
    CookieNames,
    OrgRoleStatus,
    PortalUserStatus,
    TerritoryStatus,
    InvitationStatus,
    OnboardingStatus,
    PermissionChangeType,
};
