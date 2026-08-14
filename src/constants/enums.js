/**
 * Cookie names - must match the names userbd sets when it issues tokens,
 * since auth here only ever reads the cookie, never sets it.
 */
export const CookieNames = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    SESSION_ID: 'sessionId',
};

export default {
    CookieNames,
};
