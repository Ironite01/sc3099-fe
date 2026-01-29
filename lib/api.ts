/**
 * API Helper for SAIV Frontend
 *
 * Provides a reusable fetch wrapper that:
 * - Prepends NEXT_PUBLIC_BACKEND_URL to all paths
 * - Always includes credentials for HttpOnly cookie auth
 * - Sets JSON headers by default
 * - Includes Authorization header with stored access token
 */

import { getAccessToken, storeAccessToken, storeRefreshToken, configureTokenStorage } from './tokenStorage';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Configure token storage to use sessionStorage for persistence across page navigations
// Only run in browser environment
if (typeof window !== 'undefined') {
    configureTokenStorage({ accessTokenStrategy: 'sessionStorage' });
}

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

    const accessToken = getAccessToken();

    const config: RequestInit = {
        ...restOptions,
        credentials: 'include', // Always include cookies
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
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
 * Store tokens after successful login
 */
export function saveTokens(accessToken: string, refreshToken: string): void {
    storeAccessToken(accessToken);
    storeRefreshToken(refreshToken);
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
            // Store tokens for subsequent API calls
            saveTokens(data.access_token, data.refresh_token);
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

/**
 * Enroll face for identity verification
 * @param imageBase64 - Base64-encoded face image (without data URL prefix)
 * @returns Promise with enrollment result
 */
export async function enrollFace(imageBase64: string): Promise<{
    success: boolean;
    data?: {
        message: string;
        face_enrolled: boolean;
        quality_score: number;
    };
    error?: string;
    status?: number;
}> {
    try {
        const response = await apiFetch('/api/v1/users/me/face/enroll', {
            method: 'POST',
            body: { image: imageBase64 },
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        // Handle specific error codes
        if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            return { 
                success: false, 
                error: errorData.detail || 'No face detected or camera consent not given', 
                status: 400 
            };
        }
        if (response.status === 401) {
            return { success: false, error: 'Please log in first', status: 401 };
        }
        if (response.status === 503) {
            return { success: false, error: 'Face recognition service unavailable', status: 503 };
        }

        return { success: false, error: 'An error occurred. Please try again.', status: response.status };
    } catch (error) {
        console.error('Face enrollment error:', error);
        return { success: false, error: 'Unable to connect to server. Please check your connection.' };
    }
}

/**
 * Update user consent settings
 * @param cameraConsent - Camera permission consent
 * @param geolocationConsent - Geolocation permission consent
 * @returns Promise with update result
 */
export async function updateConsent(
    cameraConsent?: boolean,
    geolocationConsent?: boolean
): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const body: { camera_consent?: boolean; geolocation_consent?: boolean } = {};
        if (cameraConsent !== undefined) body.camera_consent = cameraConsent;
        if (geolocationConsent !== undefined) body.geolocation_consent = geolocationConsent;

        const response = await apiFetch('/api/v1/users/me', {
            method: 'PUT',
            body,
        });

        if (response.ok) {
            return { success: true };
        }

        return { success: false, error: 'Failed to update consent settings' };
    } catch (error) {
        console.error('Update consent error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

/**
 * Register a new user
 * @param email - User email
 * @param password - User password
 * @param fullName - User full name
 * @param role - User role (default: student)
 * @returns Promise with registration result
 */
export async function register(
    email: string,
    password: string,
    fullName: string,
    role: string = 'student'
): Promise<{
    success: boolean;
    data?: {
        id: string;
        email: string;
        full_name: string;
        role: string;
    };
    error?: string;
    status?: number;
}> {
    try {
        const response = await apiFetch('/api/v1/auth/register', {
            method: 'POST',
            body: { email, password, full_name: fullName, role },
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            return { success: false, error: errorData.detail || 'Invalid registration data', status: 400 };
        }
        if (response.status === 409) {
            return { success: false, error: 'Email already registered', status: 409 };
        }

        return { success: false, error: 'Registration failed. Please try again.', status: response.status };
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: 'Unable to connect to server. Please check your connection.' };
    }
}

/**
 * Get current user profile
 * @returns Promise with user data
 */
export async function getCurrentUser(): Promise<{
    success: boolean;
    data?: {
        id: string;
        email: string;
        full_name: string;
        role: string;
        face_enrolled: boolean;
        camera_consent: boolean;
        geolocation_consent: boolean;
    };
    error?: string;
}> {
    try {
        const response = await apiFetch('/api/v1/users/me');

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        if (response.status === 401) {
            return { success: false, error: 'Not authenticated' };
        }

        return { success: false, error: 'Failed to fetch user profile' };
    } catch (error) {
        console.error('Get user error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

/**
 * Get active sessions for check-in
 * @returns Promise with active sessions list
 */
export async function getActiveSessions(): Promise<{
    success: boolean;
    data?: Array<{
        id: string;
        course_name: string;
        session_type: string;
        start_time: string;
        end_time: string;
        location_lat: number;
        location_lon: number;
        location_radius_m: number;
        allow_late_checkin: boolean;
        late_checkin_minutes: number;
    }>;
    error?: string;
}> {
    try {
        const response = await apiFetch('/api/v1/sessions/active');

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        if (response.status === 401) {
            return { success: false, error: 'Not authenticated' };
        }

        return { success: false, error: 'Failed to fetch active sessions' };
    } catch (error) {
        console.error('Get active sessions error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

/**
 * Submit a check-in
 * @param sessionId - Session ID
 * @param imageBase64 - Face image (base64)
 * @param latitude - GPS latitude
 * @param longitude - GPS longitude
 * @param deviceFingerprint - Device fingerprint
 * @param devicePublicKey - Device public key (PEM format)
 * @param livenessToken - Optional liveness token
 * @returns Promise with check-in result
 */
export async function submitCheckIn(params: {
    sessionId: string;
    imageBase64: string;
    latitude: number;
    longitude: number;
    deviceFingerprint: string;
    devicePublicKey: string;
    livenessToken?: string;
}): Promise<{
    success: boolean;
    data?: {
        id: string;
        session_id: string;
        risk_score: number;
        status: string;
        face_match_confidence: number;
        liveness_score: number;
        location_verified: boolean;
        device_trusted: boolean;
        check_in_time: string;
    };
    error?: string;
    status?: number;
}> {
    try {
        const response = await apiFetch('/api/v1/check-ins', {
            method: 'POST',
            body: {
                session_id: params.sessionId,
                image: params.imageBase64,
                latitude: params.latitude,
                longitude: params.longitude,
                device_fingerprint: params.deviceFingerprint,
                device_public_key: params.devicePublicKey,
                liveness_token: params.livenessToken,
            },
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            return { success: false, error: errorData.detail || 'Invalid check-in data', status: 400 };
        }
        if (response.status === 401) {
            return { success: false, error: 'Not authenticated', status: 401 };
        }
        if (response.status === 403) {
            const errorData = await response.json().catch(() => ({}));
            return { success: false, error: errorData.detail || 'Check-in not allowed', status: 403 };
        }
        if (response.status === 404) {
            return { success: false, error: 'Session not found', status: 404 };
        }
        if (response.status === 409) {
            return { success: false, error: 'Already checked in', status: 409 };
        }
        if (response.status === 503) {
            return { success: false, error: 'Face recognition service unavailable', status: 503 };
        }

        return { success: false, error: 'Check-in failed. Please try again.', status: response.status };
    } catch (error) {
        console.error('Check-in error:', error);
        return { success: false, error: 'Unable to connect to server. Please check your connection.' };
    }
}

/**
 * Get user's check-in history
 * @param limit - Number of check-ins to fetch (default: 10)
 * @returns Promise with check-in history
 */
export async function getCheckInHistory(limit: number = 10): Promise<{
    success: boolean;
    data?: Array<{
        id: string;
        session_id: string;
        course_name: string;
        session_type: string;
        check_in_time: string;
        risk_score: number;
        status: string;
        face_match_confidence: number;
        liveness_score: number;
        location_verified: boolean;
        device_trusted: boolean;
    }>;
    error?: string;
}> {
    try {
        const response = await apiFetch(`/api/v1/check-ins/me?limit=${limit}`);

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        if (response.status === 401) {
            return { success: false, error: 'Not authenticated' };
        }

        return { success: false, error: 'Failed to fetch check-in history' };
    } catch (error) {
        console.error('Get check-in history error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

/**
 * Get user's enrolled courses
 * @returns Promise with enrolled courses
 */
export async function getEnrolledCourses(): Promise<{
    success: boolean;
    data?: Array<{
        id: string;
        course_code: string;
        course_name: string;
        enrolled_at: string;
    }>;
    error?: string;
}> {
    try {
        const response = await apiFetch('/api/v1/enrollments/me');

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        if (response.status === 401) {
            return { success: false, error: 'Not authenticated' };
        }

        return { success: false, error: 'Failed to fetch enrolled courses' };
    } catch (error) {
        console.error('Get enrolled courses error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

/**
 * Logout user
 * @returns Promise with logout result
 */
export async function logout(): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const response = await apiFetch('/api/v1/auth/logout', {
            method: 'POST',
        });

        if (response.ok) {
            return { success: true };
        }

        return { success: false, error: 'Logout failed' };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

