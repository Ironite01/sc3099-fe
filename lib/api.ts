/**
 * API Helper for SAIV Frontend
 * 
 * Provides a reusable fetch wrapper that:
 * - Prepends NEXT_PUBLIC_BACKEND_URL to all paths
 * - Always includes credentials for HttpOnly cookie auth
 * - Sets JSON headers by default
 */

import type { Session, Course, AttendancePayload, AttendanceResult, ApiResponse, RegisterPayload, User, StudentCheckin, DeviceRecord, CheckinChallenge } from './types';

// Use ?? so an intentionally empty NEXT_PUBLIC_BACKEND_URL stays '' (relative path → Next.js proxy).
// Only falls back to localhost:8000 when the variable is completely absent (undefined).
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
    body?: object | string;
}

function normalizeCourseList(payload: any): Course[] {
    if (Array.isArray(payload)) return payload as Course[];
    if (Array.isArray(payload?.items)) return payload.items as Course[];
    return [];
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
            ...headers,
        },
    };

    // Add Content-Type only if not already present and we have a body
    const headersRecord = headers as Record<string, string>;
    if (body !== undefined && !headersRecord?.['Content-Type']) {
        (config.headers as any)['Content-Type'] = 'application/json';
    }

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
        // Use same-origin request through Next.js rewrite proxy (/api/* → backend)
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-saiv-cookie-auth': '1',
            },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
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

/**
 * Register API call
 * @param payload - User registration details
 * @returns Promise with response data or error
 */
export async function register(payload: RegisterPayload): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    status?: number;
}> {
    try {
        const response = await apiFetch('/api/v1/auth/register', {
            method: 'POST',
            body: payload,
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        if (response.status === 400) {
            const errorData = await response.json().catch(() => ({} as any));
            // Map raw Fastify/AJV schema errors to clean user-facing messages
            const raw: string = String(errorData?.detail || errorData?.message || '').toLowerCase();
            let clean = 'Please check your details and try again.';
            if (/already\s*registered|already\s*exists|duplicate/.test(raw)) clean = 'An account with this email already exists';
            else if (/full_name/.test(raw)) clean = 'Please enter your full name (at least 4 characters).';
            else if (/email/.test(raw)) clean = 'Please enter a valid email address.';
            else if (/password/.test(raw)) clean = 'Password does not meet the requirements.';
            else if (/required property 'role'|role/.test(raw)) clean = 'Registration role is missing. Please refresh and try again.';
            return { success: false, error: clean, status: 400 };
        }

        if (response.status === 409) {
            return { success: false, error: 'An account with this email already exists', status: 409 };
        }

        if (response.status === 422) {
            const errorData = await response.json().catch(() => ({} as any));
            const detail = errorData?.detail;
            if (Array.isArray(detail) && detail.length > 0) {
                const msg = String(detail[0]?.msg || 'Invalid input');
                if (/email/i.test(msg)) return { success: false, error: 'Please enter a valid email address.', status: 422 };
                if (/password/i.test(msg)) return { success: false, error: 'Password does not meet the requirements.', status: 422 };
                if (/full_name/i.test(msg)) return { success: false, error: 'Please enter your full name (at least 4 characters).', status: 422 };
            }
            return { success: false, error: 'Please check your details and try again.', status: 422 };
        }

        if (response.status === 429) {
            return { success: false, error: 'Too many registration attempts. Please wait and try again.', status: 429 };
        }

        return { success: false, error: 'Registration failed. Please try again.', status: response.status };
    } catch (error) {
        console.error('Registration error:', error);
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

export async function getMe(): Promise<ApiResponse<User>> {
    try {
        const response = await apiFetch('/api/v1/users/me');
        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }
        if (response.status === 401) return { success: false, error: 'Not authenticated', status: 401 };
        return { success: false, error: 'Failed to fetch user', status: response.status };
    } catch {
        return { success: false, error: 'Unable to connect to server.' };
    }
}

export async function logout(): Promise<void> {
    try {
        await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {
        // Ignore errors — redirect to login regardless
    } finally {
        sessionStorage.removeItem('saiv_user');
    }
}

export async function getMyCourses(): Promise<ApiResponse<Course[]>> {
    try {
        const response = await apiFetch('/api/v1/enrollments/my-enrollments');

        if (response.ok) {
            const data = await response.json();
            return { success: true, data: normalizeCourseList(data) };
        }

        if (response.status === 401) {
            return { success: false, error: 'Please log in first', status: 401 };
        }

        return { success: false, error: 'Failed to fetch courses', status: response.status };
    } catch (error) {
        console.error('Get courses error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

export async function getAvailableCourses(): Promise<ApiResponse<Course[]>> {
    try {
        const response = await apiFetch('/api/v1/courses');

        if (response.ok) {
            const data = await response.json();
            return { success: true, data: normalizeCourseList(data) };
        }

        return { success: false, error: 'Failed to fetch available courses', status: response.status };
    } catch (error) {
        console.error('Get available courses error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

export async function getActiveSessions(): Promise<ApiResponse<Session[]>> {
    try {
        const response = await apiFetch('/api/v1/sessions/active');

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        if (response.status === 401) {
            return { success: false, error: 'Please log in first', status: 401 };
        }

        return { success: false, error: 'Failed to fetch active sessions', status: response.status };
    } catch (error) {
        console.error('Get sessions error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

export async function getMyCheckins(limit: number = 10): Promise<ApiResponse<StudentCheckin[]>> {
    try {
        const clampedLimit = Math.max(1, Math.min(limit, 200));
        const response = await apiFetch(`/api/v1/checkins/my-checkins?limit=${clampedLimit}`);

        if (response.ok) {
            const data = await response.json();
            return { success: true, data: Array.isArray(data) ? data : [] };
        }

        if (response.status === 401) {
            return { success: false, error: 'Please log in first', status: 401 };
        }

        return { success: false, error: 'Failed to fetch your check-ins', status: response.status };
    } catch (error) {
        console.error('Get my check-ins error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

export async function submitAttendance(payload: AttendancePayload): Promise<ApiResponse<AttendanceResult>> {
    if (!payload.session_id) {
        return { success: false, error: 'Missing session ID. Please re-open the session QR link.', status: 400 };
    }
    if (!payload.device_fingerprint) {
        return { success: false, error: 'Missing device fingerprint. Please refresh and try again.', status: 400 };
    }
    if (!payload.face_image && !payload.liveness_token) {
        return { success: false, error: 'Face capture is missing. Please try scanning again.', status: 400 };
    }
    if (!Number.isFinite(payload.location?.latitude) || !Number.isFinite(payload.location?.longitude)) {
        return { success: false, error: 'Location is invalid. Please allow precise location and retry.', status: 400 };
    }
    try {
        const includeLiveness =
            !!payload.liveness_challenge_token ||
            !!payload.liveness_image ||
            (payload.liveness_challenge_type && payload.liveness_challenge_type !== 'passive');

        const response = await apiFetch('/api/v1/checkins', {
            method: 'POST',
            body: {
                session_id: payload.session_id,
                latitude: payload.location.latitude,
                longitude: payload.location.longitude,
                location_accuracy_meters: payload.location.accuracy || 10,
                device_fingerprint: payload.device_fingerprint,
                // Explicit verification image for face-match flow.
                face_verification_image: payload.face_image || '',
                ...(includeLiveness
                    ? {
                        // Use dedicated liveness image when available; fallback keeps backward compatibility.
                        liveness_challenge_response: payload.liveness_image || payload.face_image || payload.liveness_token,
                        liveness_challenge_type: payload.liveness_challenge_type || 'passive',
                        liveness_challenge_token: payload.liveness_challenge_token || '',
                    }
                    : {}),
                qr_code: payload.qr_code || '',
            },
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            const raw: string = errorData.message || errorData.detail || '';
            let msg = raw || 'Invalid attendance submission.';
            if (/already checked in/i.test(raw)) msg = 'You have already checked into this session.';
            else if (/not enrolled|not in this course/i.test(raw)) msg = 'You are not enrolled in this course.';
            else if (/window closed/i.test(raw)) msg = 'The check-in window for this session has closed.';
            else if (/not active/i.test(raw)) msg = 'This session is not currently active.';
            else if (/geofence/i.test(raw)) msg = 'You are outside the permitted location for this session.';
            else if (/venue location/i.test(raw)) msg = 'This session has no venue configured.';
            else if (/device not registered/i.test(raw)) msg = 'Your device is not registered. Please try again — registration is automatic.';
            else if (/device.*(deactivated|inactive)/i.test(raw)) msg = 'Your device has been deactivated. Please contact your instructor.';
            else if (/device fingerprint.*required/i.test(raw)) msg = 'Device verification is required for this session.';
            else if (/device is not allowed/i.test(raw)) msg = 'This device is not trusted yet. Please use your bound device or contact instructor/admin.';
            else if (/invalid qr code/i.test(raw)) msg = 'QR is invalid. Please generate a new QR/session link and try again.';
            else if (/qr code expired/i.test(raw)) msg = 'QR has expired. Please get a fresh QR/session link.';
            else if (/qr code is required/i.test(raw)) msg = 'QR is required for this check-in. Please scan/open the session link again.';
            else if (/liveness challenge response is required/i.test(raw)) msg = 'Face/liveness image is missing. Please retake the face scan.';
            else if (/unable to perform face verification/i.test(raw)) msg = 'Face profile is not enrolled. Please complete face enrollment first.';
            else if (/session not found/i.test(raw)) msg = 'Session was not found. Please refresh and scan a valid session link.';
            return { success: false, error: msg, status: 400 };
        }

        if (response.status === 422) {
            const errorData = await response.json().catch(() => ({}));
            const detail = errorData?.detail || errorData?.message || 'Validation failed. Please check all required fields.';
            return { success: false, error: String(detail), status: 422 };
        }

        if (response.status === 401) {
            return { success: false, error: 'Please log in first', status: 401 };
        }

        if (response.status === 403) {
            return { success: false, error: 'Face verification failed', status: 403 };
        }

        if (response.status === 404) {
            const errorData = await response.json().catch(() => ({}));
            const raw: string = errorData.message || errorData.detail || '';
            let msg = raw || 'Requested resource not found.';
            if (/device not found/i.test(raw)) {
                msg = 'This browser/device is not bound to your account. Open My Devices and bind this device before check-in.';
            } else if (/session not found/i.test(raw)) {
                msg = 'Session was not found. Please refresh and scan a valid session link.';
            }
            return { success: false, error: msg, status: 404 };
        }

        return { success: false, error: 'Failed to submit attendance', status: response.status };
    } catch (error) {
        console.error('Submit attendance error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

export async function getSessionById(sessionId: string): Promise<ApiResponse<Session>> {
    if (!sessionId) {
        return { success: false, error: 'Missing session ID', status: 400 };
    }

    try {
        const response = await apiFetch(`/api/v1/sessions/${sessionId}`);

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        if (response.status === 401) {
            return { success: false, error: 'Please log in first', status: 401 };
        }

        if (response.status === 404) {
            return { success: false, error: 'Session not found', status: 404 };
        }

        return { success: false, error: 'Failed to fetch session details', status: response.status };
    } catch (error) {
        console.error('Get session by ID error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

export async function getCheckinChallenge(sessionId: string): Promise<ApiResponse<CheckinChallenge>> {
    if (!sessionId) {
        return { success: false, error: 'Missing session ID', status: 400 };
    }

    try {
        const response = await apiFetch('/api/v1/checkins/challenge', {
            method: 'POST',
            body: { session_id: sessionId },
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.message || errorData.detail || 'Failed to get liveness challenge';
        return { success: false, error: msg, status: response.status };
    } catch (error) {
        console.error('Get checkin challenge error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

// ── Device Management ────────────────────────────────────────────────────────

/**
 * Register (or refresh) the current device fingerprint in the backend.
 * Uses upsert semantics — safe to call on every attendance page load.
 *
 * @param payload - Device info to register
 * @param accessToken - Optional JWT token. When provided, used as `Authorization: Bearer`
 *                      header instead of relying on cookies. This is essential right after
 *                      login/register when the httpOnly cookie may not yet be stored.
 */
function parseUserAgent(ua: string): string {
    if (!ua || ua === 'Browser' || !ua.includes('/')) return ua;

    let browser = 'Unknown Browser';
    if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
    else if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

    let os = 'Unknown OS';
    if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
    else if (ua.includes('Windows NT')) os = 'Windows';
    else if (ua.includes('Mac OS X')) os = 'macOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Linux')) os = 'Linux';

    return `${browser} on ${os}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function getOrCreateDevicePublicKey(): Promise<string> {
    if (typeof window === 'undefined') return '';

    const STORAGE_KEY = 'saiv_device_public_key_spki_b64';
    const cached = window.localStorage.getItem(STORAGE_KEY);
    if (cached && cached.length > 0) {
        return cached;
    }

    const subtle = window.crypto?.subtle;
    if (!subtle) return '';

    const keyPair = await subtle.generateKey(
        {
            name: 'ECDSA',
            namedCurve: 'P-256',
        },
        true,
        ['sign', 'verify']
    );

    const spki = await subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyB64 = arrayBufferToBase64(spki);
    window.localStorage.setItem(STORAGE_KEY, publicKeyB64);
    return publicKeyB64;
}

export async function registerDevice(payload: {
    device_fingerprint: string;
    device_name?: string;
    platform?: string;
    public_key?: string;
}, accessToken?: string): Promise<ApiResponse<DeviceRecord>> {
    const finalDeviceName = payload.device_name ? parseUserAgent(payload.device_name) : 'Unknown Browser';
    let publicKey = payload.public_key ?? '';
    if (!publicKey) {
        try {
            publicKey = await getOrCreateDevicePublicKey();
        } catch {
            publicKey = '';
        }
    }

    if (!publicKey) {
        return {
            success: false,
            error: 'Could not generate device public key on this browser.',
            status: 400,
        };
    }

    const finalPayload = { ...payload, device_name: finalDeviceName, public_key: publicKey };

    try {
        const headers: Record<string, string> = {};
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }
        const res = await apiFetch('/api/v1/devices/register', {
            method: 'POST',
            body: finalPayload,
            headers,
        });
        if (res.ok) {
            const data = await res.json();
            return { success: true, data };
        }
        const errBody = await res.text().catch(() => '');
        let parsedMessage = `Device registration failed (${res.status}).`;
        try {
            const parsed = JSON.parse(errBody);
            if (parsed.detail) {
                parsedMessage = String(parsed.detail);
            } else if (parsed.message) {
                parsedMessage = String(parsed.message);
            } else if (parsed.error) {
                parsedMessage = String(parsed.error);
            }
        } catch (_e) { }

        const lower = parsedMessage.toLowerCase();
        if (lower.includes('device fingerprint already registered to another account')) {
            parsedMessage = 'This browser/device is currently bound to another account. Use that account to remove it first, or use another browser/device.';
        } else if (res.status === 409) {
            parsedMessage = 'This browser/device is already linked to another account.';
        }

        return { success: false, error: parsedMessage, status: res.status };
    } catch (err) {
        console.error('[SAIV] registerDevice network error:', err);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

/** Fetch the current student's registered devices. */
export async function getMyDevices(): Promise<ApiResponse<DeviceRecord[]>> {
    try {
        const res = await apiFetch('/api/v1/devices/my-devices');
        if (res.ok) {
            const data = await res.json();
            return { success: true, data: Array.isArray(data) ? data : [] };
        }
        return { success: false, error: 'Failed to load devices', status: res.status };
    } catch {
        return { success: false, error: 'Unable to connect to server.' };
    }
}

/** Remove a registered device by ID. */
export async function deleteDevice(deviceId: string): Promise<ApiResponse<void>> {
    try {
        const res = await apiFetch(`/api/v1/devices/${deviceId}`, { method: 'DELETE' });
        if (res.status === 204 || res.ok) {
            return { success: true };
        }

        const errBody = await res.text().catch(() => '');
        let parsedMessage = `Failed to remove device (${res.status})`;

        try {
            const parsed = JSON.parse(errBody);
            if (parsed.message) {
                parsedMessage = parsed.message;
            } else if (parsed.error) {
                parsedMessage = parsed.error;
            }
        } catch (e) { }

        return { success: false, error: parsedMessage, status: res.status };
    } catch {
        return { success: false, error: 'Unable to connect to server.' };
    }
}

