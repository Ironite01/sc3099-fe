/**
 * Token Storage Security Utilities
 *
 * Per PDF requirements (Page 5):
 * - Access token: Memory or sessionStorage (XSS vulnerable but acceptable)
 * - Refresh token: HttpOnly cookie (ideal) or secure storage
 * - NEVER store tokens in URL or logs
 * - Clear tokens on logout
 */

// In-memory token storage (safest for access token, lost on refresh)
let inMemoryAccessToken: string | null = null;

export type TokenStorageStrategy = 'memory' | 'sessionStorage' | 'localStorage';

export interface TokenConfig {
    accessTokenStrategy: TokenStorageStrategy;
    useHttpOnlyCookieForRefresh: boolean;
}

const DEFAULT_CONFIG: TokenConfig = {
    accessTokenStrategy: 'memory',
    useHttpOnlyCookieForRefresh: true,
};

let currentConfig: TokenConfig = { ...DEFAULT_CONFIG };

/**
 * Configure token storage strategy
 */
export function configureTokenStorage(config: Partial<TokenConfig>): void {
    currentConfig = { ...currentConfig, ...config };
}

/**
 * Get current token storage configuration
 */
export function getTokenStorageConfig(): TokenConfig {
    return { ...currentConfig };
}

/**
 * Store access token based on configured strategy
 * - memory: Safest, but lost on page refresh
 * - sessionStorage: Tab-scoped, XSS vulnerable
 * - localStorage: Persists across sessions, XSS vulnerable (NOT recommended)
 */
export function storeAccessToken(token: string): void {
    if (!token) {
        throw new Error('Token cannot be empty');
    }

    // Validate token doesn't appear to be a URL (security check)
    if (token.startsWith('http://') || token.startsWith('https://')) {
        throw new Error('Invalid token format - tokens should not be URLs');
    }

    // Always store in memory
    inMemoryAccessToken = token;

    // In browser, always store in sessionStorage for persistence across navigations
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('access_token', token);
    }
}

/**
 * Retrieve access token from configured storage
 * Always checks sessionStorage first when in browser for reliability
 */
export function getAccessToken(): string | null {
    // In browser, always try sessionStorage first (most reliable across navigations)
    if (typeof window !== 'undefined') {
        const sessionToken = sessionStorage.getItem('access_token');
        if (sessionToken) {
            return sessionToken;
        }
        const localToken = localStorage.getItem('access_token');
        if (localToken) {
            return localToken;
        }
    }
    // Fall back to memory
    return inMemoryAccessToken;
}

/**
 * Store refresh token
 * If useHttpOnlyCookieForRefresh is true, this does nothing
 * (server should set HttpOnly cookie directly)
 */
export function storeRefreshToken(token: string): void {
    if (currentConfig.useHttpOnlyCookieForRefresh) {
        // Refresh token should be set by server as HttpOnly cookie
        // This function is a no-op in that case
        console.info('Refresh token should be set by server as HttpOnly cookie');
        return;
    }

    if (!token) {
        throw new Error('Token cannot be empty');
    }

    // Use sessionStorage for refresh token if not using HttpOnly cookie
    sessionStorage.setItem('refresh_token', token);
}

/**
 * Retrieve refresh token
 * Returns null if using HttpOnly cookie strategy (token is in cookie, not accessible via JS)
 */
export function getRefreshToken(): string | null {
    if (currentConfig.useHttpOnlyCookieForRefresh) {
        // Refresh token is in HttpOnly cookie, not accessible via JavaScript
        return null;
    }

    return sessionStorage.getItem('refresh_token');
}

/**
 * Clear all tokens (for logout)
 */
export function clearAllTokens(): void {
    // Clear memory
    inMemoryAccessToken = null;

    // Clear sessionStorage
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');

    // Clear localStorage (in case it was used)
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    // Note: HttpOnly cookies must be cleared by the server
    // The logout API call should handle this
}

/**
 * Check if user has a valid access token stored
 */
export function hasAccessToken(): boolean {
    const token = getAccessToken();
    return token !== null && token.length > 0;
}

/**
 * Decode JWT token payload (without verification)
 * Used for checking expiration client-side
 */
export function decodeTokenPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

/**
 * Check if access token is expired
 */
export function isAccessTokenExpired(): boolean {
    const token = getAccessToken();
    if (!token) {
        return true;
    }

    const payload = decodeTokenPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
        return true;
    }

    // Token is expired if exp timestamp is in the past
    // Add 30 second buffer for clock skew
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp < nowInSeconds + 30;
}

/**
 * Get token expiration time in milliseconds
 */
export function getAccessTokenExpiry(): number | null {
    const token = getAccessToken();
    if (!token) {
        return null;
    }

    const payload = decodeTokenPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
        return null;
    }

    return payload.exp * 1000;
}

/**
 * Security check: Ensure tokens are not in URL
 */
export function validateNoTokensInUrl(): boolean {
    const url = window.location.href;
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    // Check for common token parameter names
    const tokenParams = ['token', 'access_token', 'refresh_token', 'jwt', 'auth'];

    for (const param of tokenParams) {
        if (searchParams.has(param)) {
            console.error(`Security warning: Token found in URL parameter: ${param}`);
            return false;
        }
    }

    // Check hash for token patterns
    if (hash.includes('access_token=') || hash.includes('token=')) {
        console.error('Security warning: Token found in URL hash');
        return false;
    }

    return true;
}

/**
 * Sanitize token for logging (show only first/last 4 chars)
 */
export function sanitizeTokenForLogging(token: string): string {
    if (!token || token.length < 12) {
        return '[REDACTED]';
    }

    return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

/**
 * Reset token storage to defaults (useful for testing)
 */
export function resetTokenStorage(): void {
    inMemoryAccessToken = null;
    currentConfig = { ...DEFAULT_CONFIG };
    clearAllTokens();
}
