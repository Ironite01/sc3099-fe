/**
 * API Helper for SAIV Frontend
 * 
 * Provides a reusable fetch wrapper that:
 * - Prepends NEXT_PUBLIC_BACKEND_URL to all paths
 * - Always includes credentials for HttpOnly cookie auth
 * - Sets JSON headers by default
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:8000';

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
    body?: object | string;
}

/**
 * Fetch wrapper for API calls
 * @param path - API path (e.g., '/api/v1/auth/login')
 * @param options - Fetch options with optional JSON body
 * @returns Promise<Response>
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
    const { body, headers, ...restOptions } = options;

    const config: RequestInit = {
        ...restOptions,
        credentials: 'include', // Always include cookies
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };

    // Handle body - if it's an object, stringify it
    if (body !== undefined) {
        config.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const url = `${API_BASE_URL}${path}`;
    return fetch(url, config);
}

/**
 * Login API call
 * @param email - User email
 * @param password - User password
 * @returns Promise with response data or error
 */
export async function login(email: string, password: string): Promise<{
    success: boolean;
    data?: {
        access_token: string;
        refresh_token: string;
        token_type: string;
        user: {
            id: string;
            email: string;
            full_name: string;
            role: string;
        };
    };
    error?: string;
    status?: number;
}> {
    try {
        const response = await apiFetch('/api/v1/auth/login', {
            method: 'POST',
            body: { email, password },
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        // Handle specific error codes
        if (response.status === 401) {
            return { success: false, error: 'Invalid email or password', status: 401 };
        }
        if (response.status === 429) {
            return { success: false, error: 'Too many attempts, please try later', status: 429 };
        }
        if (response.status === 403) {
            return { success: false, error: 'Account is disabled', status: 403 };
        }

        // Generic error
        return { success: false, error: 'An error occurred. Please try again.', status: response.status };
    } catch (error) {
        // Network error
        console.error('Login error:', error);
        return { success: false, error: 'Unable to connect to server. Please check your connection.' };
    }
}
