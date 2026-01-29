/**
 * Tests for Token Storage Security Utilities
 * Covers PDF requirements (Page 5):
 * - Access token: Memory or sessionStorage
 * - Refresh token: HttpOnly cookie (ideal) or secure storage
 * - NEVER store tokens in URL or logs
 * - Clear tokens on logout
 */

import {
    configureTokenStorage,
    getTokenStorageConfig,
    storeAccessToken,
    getAccessToken,
    storeRefreshToken,
    getRefreshToken,
    clearAllTokens,
    hasAccessToken,
    decodeTokenPayload,
    isAccessTokenExpired,
    getAccessTokenExpiry,
    validateNoTokensInUrl,
    sanitizeTokenForLogging,
    resetTokenStorage,
} from '../tokenStorage';

describe('Token Storage Utilities', () => {
    // Mock sessionStorage
    const sessionStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        resetTokenStorage();

        Object.defineProperty(window, 'sessionStorage', {
            value: sessionStorageMock,
            writable: true,
        });

        // Reset location for URL tests
        Object.defineProperty(window, 'location', {
            value: {
                href: 'http://localhost:3000/',
                search: '',
                hash: '',
            },
            writable: true,
        });
    });

    describe('configureTokenStorage', () => {
        it('should set token storage configuration', () => {
            configureTokenStorage({
                accessTokenStrategy: 'sessionStorage',
                useHttpOnlyCookieForRefresh: false,
            });

            const config = getTokenStorageConfig();

            expect(config.accessTokenStrategy).toBe('sessionStorage');
            expect(config.useHttpOnlyCookieForRefresh).toBe(false);
        });

        it('should merge with existing config', () => {
            configureTokenStorage({ accessTokenStrategy: 'memory' });
            configureTokenStorage({ useHttpOnlyCookieForRefresh: false });

            const config = getTokenStorageConfig();

            expect(config.accessTokenStrategy).toBe('memory');
            expect(config.useHttpOnlyCookieForRefresh).toBe(false);
        });
    });

    describe('storeAccessToken - memory strategy', () => {
        beforeEach(() => {
            configureTokenStorage({ accessTokenStrategy: 'memory' });
        });

        it('should store token in memory', () => {
            storeAccessToken('test-token-123');

            const token = getAccessToken();

            expect(token).toBe('test-token-123');
            expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
            expect(localStorage.setItem).not.toHaveBeenCalled();
        });

        it('should throw error for empty token', () => {
            expect(() => storeAccessToken('')).toThrow('Token cannot be empty');
        });

        it('should reject URL-like tokens', () => {
            expect(() => storeAccessToken('http://malicious.com')).toThrow(
                'Invalid token format - tokens should not be URLs'
            );
            expect(() => storeAccessToken('https://malicious.com')).toThrow(
                'Invalid token format - tokens should not be URLs'
            );
        });
    });

    describe('storeAccessToken - sessionStorage strategy', () => {
        beforeEach(() => {
            configureTokenStorage({ accessTokenStrategy: 'sessionStorage' });
        });

        it('should store token in sessionStorage', () => {
            storeAccessToken('session-token-456');

            expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
                'access_token',
                'session-token-456'
            );
        });

        it('should retrieve token from sessionStorage', () => {
            sessionStorageMock.getItem.mockReturnValueOnce('session-token-456');

            const token = getAccessToken();

            expect(sessionStorageMock.getItem).toHaveBeenCalledWith('access_token');
            expect(token).toBe('session-token-456');
        });
    });

    describe('storeAccessToken - localStorage strategy (with warning)', () => {
        beforeEach(() => {
            configureTokenStorage({ accessTokenStrategy: 'localStorage' });
        });

        it('should store token in localStorage with security warning', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            storeAccessToken('local-token-789');

            expect(localStorage.setItem).toHaveBeenCalledWith('access_token', 'local-token-789');
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('XSS vulnerable')
            );

            consoleSpy.mockRestore();
        });

        it('should retrieve token from localStorage', () => {
            (localStorage.getItem as jest.Mock).mockReturnValueOnce('local-token-789');

            const token = getAccessToken();

            expect(localStorage.getItem).toHaveBeenCalledWith('access_token');
            expect(token).toBe('local-token-789');
        });
    });

    describe('storeRefreshToken', () => {
        it('should not store refresh token when using HttpOnly cookie strategy', () => {
            configureTokenStorage({ useHttpOnlyCookieForRefresh: true });
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

            storeRefreshToken('refresh-token');

            expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('HttpOnly cookie')
            );

            consoleSpy.mockRestore();
        });

        it('should store in sessionStorage when not using HttpOnly cookie', () => {
            configureTokenStorage({ useHttpOnlyCookieForRefresh: false });

            storeRefreshToken('refresh-token-123');

            expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
                'refresh_token',
                'refresh-token-123'
            );
        });

        it('should throw error for empty token when not using HttpOnly', () => {
            configureTokenStorage({ useHttpOnlyCookieForRefresh: false });

            expect(() => storeRefreshToken('')).toThrow('Token cannot be empty');
        });
    });

    describe('getRefreshToken', () => {
        it('should return null when using HttpOnly cookie strategy', () => {
            configureTokenStorage({ useHttpOnlyCookieForRefresh: true });

            const token = getRefreshToken();

            expect(token).toBeNull();
        });

        it('should return token from sessionStorage when not using HttpOnly', () => {
            configureTokenStorage({ useHttpOnlyCookieForRefresh: false });
            sessionStorageMock.getItem.mockReturnValueOnce('refresh-token');

            const token = getRefreshToken();

            expect(token).toBe('refresh-token');
        });
    });

    describe('clearAllTokens', () => {
        it('should clear tokens from all storage locations', () => {
            // Store some tokens first
            configureTokenStorage({ accessTokenStrategy: 'memory' });
            storeAccessToken('test-token');

            clearAllTokens();

            expect(getAccessToken()).toBeNull();
            expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('access_token');
            expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
            expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
            expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
        });
    });

    describe('hasAccessToken', () => {
        it('should return true when token exists', () => {
            configureTokenStorage({ accessTokenStrategy: 'memory' });
            storeAccessToken('test-token');

            expect(hasAccessToken()).toBe(true);
        });

        it('should return false when no token', () => {
            expect(hasAccessToken()).toBe(false);
        });

        it('should return false for empty token', () => {
            configureTokenStorage({ accessTokenStrategy: 'sessionStorage' });
            sessionStorageMock.getItem.mockReturnValueOnce('');

            expect(hasAccessToken()).toBe(false);
        });
    });

    describe('decodeTokenPayload', () => {
        it('should decode valid JWT payload', () => {
            // Create a simple JWT: header.payload.signature
            const payload = { sub: 'user123', email: 'test@example.com', exp: 1234567890 };
            const base64Payload = btoa(JSON.stringify(payload));
            const token = `eyJhbGciOiJIUzI1NiJ9.${base64Payload}.signature`;

            const decoded = decodeTokenPayload(token);

            expect(decoded).toEqual(payload);
        });

        it('should return null for invalid token format', () => {
            expect(decodeTokenPayload('invalid-token')).toBeNull();
            expect(decodeTokenPayload('only.two.parts.here.extra')).toBeNull();
            expect(decodeTokenPayload('')).toBeNull();
        });

        it('should return null for invalid base64', () => {
            expect(decodeTokenPayload('header.!!!invalid!!!.signature')).toBeNull();
        });
    });

    describe('isAccessTokenExpired', () => {
        it('should return true when no token', () => {
            expect(isAccessTokenExpired()).toBe(true);
        });

        it('should return true when token is expired', () => {
            configureTokenStorage({ accessTokenStrategy: 'memory' });

            // Create expired token (exp in the past)
            const expiredPayload = { exp: Math.floor(Date.now() / 1000) - 3600 }; // 1 hour ago
            const base64Payload = btoa(JSON.stringify(expiredPayload));
            const token = `header.${base64Payload}.signature`;

            storeAccessToken(token);

            expect(isAccessTokenExpired()).toBe(true);
        });

        it('should return false when token is valid', () => {
            configureTokenStorage({ accessTokenStrategy: 'memory' });

            // Create valid token (exp in the future)
            const validPayload = { exp: Math.floor(Date.now() / 1000) + 3600 }; // 1 hour from now
            const base64Payload = btoa(JSON.stringify(validPayload));
            const token = `header.${base64Payload}.signature`;

            storeAccessToken(token);

            expect(isAccessTokenExpired()).toBe(false);
        });

        it('should consider token expired within 30 second buffer', () => {
            configureTokenStorage({ accessTokenStrategy: 'memory' });

            // Create token expiring in 20 seconds (within 30 second buffer)
            const almostExpiredPayload = { exp: Math.floor(Date.now() / 1000) + 20 };
            const base64Payload = btoa(JSON.stringify(almostExpiredPayload));
            const token = `header.${base64Payload}.signature`;

            storeAccessToken(token);

            expect(isAccessTokenExpired()).toBe(true);
        });
    });

    describe('getAccessTokenExpiry', () => {
        it('should return null when no token', () => {
            expect(getAccessTokenExpiry()).toBeNull();
        });

        it('should return expiry time in milliseconds', () => {
            configureTokenStorage({ accessTokenStrategy: 'memory' });

            const expTime = Math.floor(Date.now() / 1000) + 3600;
            const payload = { exp: expTime };
            const base64Payload = btoa(JSON.stringify(payload));
            const token = `header.${base64Payload}.signature`;

            storeAccessToken(token);

            expect(getAccessTokenExpiry()).toBe(expTime * 1000);
        });
    });

    describe('validateNoTokensInUrl', () => {
        it('should return true when no tokens in URL', () => {
            Object.defineProperty(window, 'location', {
                value: {
                    href: 'http://localhost:3000/dashboard',
                    search: '',
                    hash: '',
                },
                writable: true,
            });

            expect(validateNoTokensInUrl()).toBe(true);
        });

        it('should return false when token in query parameter', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            Object.defineProperty(window, 'location', {
                value: {
                    href: 'http://localhost:3000/?token=abc123',
                    search: '?token=abc123',
                    hash: '',
                },
                writable: true,
            });

            expect(validateNoTokensInUrl()).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Security warning')
            );

            consoleSpy.mockRestore();
        });

        it('should return false when access_token in query parameter', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            Object.defineProperty(window, 'location', {
                value: {
                    href: 'http://localhost:3000/?access_token=xyz',
                    search: '?access_token=xyz',
                    hash: '',
                },
                writable: true,
            });

            expect(validateNoTokensInUrl()).toBe(false);

            consoleSpy.mockRestore();
        });

        it('should return false when token in hash', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            Object.defineProperty(window, 'location', {
                value: {
                    href: 'http://localhost:3000/#access_token=xyz',
                    search: '',
                    hash: '#access_token=xyz',
                },
                writable: true,
            });

            expect(validateNoTokensInUrl()).toBe(false);

            consoleSpy.mockRestore();
        });
    });

    describe('sanitizeTokenForLogging', () => {
        it('should redact short tokens', () => {
            expect(sanitizeTokenForLogging('')).toBe('[REDACTED]');
            expect(sanitizeTokenForLogging('short')).toBe('[REDACTED]');
            expect(sanitizeTokenForLogging('12345678901')).toBe('[REDACTED]');
        });

        it('should show first and last 4 characters for long tokens', () => {
            expect(sanitizeTokenForLogging('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).toBe(
                'eyJh...VCJ9'
            );
        });
    });

    describe('resetTokenStorage', () => {
        it('should reset all state and clear tokens', () => {
            configureTokenStorage({ accessTokenStrategy: 'sessionStorage' });
            storeAccessToken('test-token');

            resetTokenStorage();

            const config = getTokenStorageConfig();
            expect(config.accessTokenStrategy).toBe('memory');
            expect(config.useHttpOnlyCookieForRefresh).toBe(true);
            expect(getAccessToken()).toBeNull();
        });
    });

    describe('Security: Token should never be in URL or logs', () => {
        it('should not allow storing URL-like values as tokens', () => {
            expect(() => storeAccessToken('http://example.com/token')).toThrow();
            expect(() => storeAccessToken('https://example.com/token')).toThrow();
        });

        it('should sanitize tokens before logging', () => {
            const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
            const sanitized = sanitizeTokenForLogging(token);

            expect(sanitized).not.toContain('payload');
            expect(sanitized).not.toContain('signature');
            expect(sanitized.length).toBeLessThan(token.length);
        });
    });

    describe('Token clearing on logout', () => {
        it('should clear all storage locations on clearAllTokens', () => {
            // Test that all possible storage locations are cleared
            clearAllTokens();

            // Memory should be cleared
            expect(getAccessToken()).toBeNull();

            // sessionStorage should be cleared
            expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('access_token');
            expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');

            // localStorage should be cleared
            expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
            expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
        });
    });
});
