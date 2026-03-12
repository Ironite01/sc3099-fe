/**
 * API Helper for SAIV Frontend
 * 
 * Provides a reusable fetch wrapper that:
 * - Prepends NEXT_PUBLIC_BACKEND_URL to all paths
 * - Always includes credentials for HttpOnly cookie auth
 * - Sets JSON headers by default
 */

import type { Session, Course, AttendancePayload, AttendanceResult, ApiResponse, RegisterPayload } from './types';
import { MOCK_ENROLLED_COURSES, MOCK_AVAILABLE_COURSES, MOCK_ACTIVE_SESSIONS, USE_MOCK_DATA } from './mockData';

// Use ?? so an intentionally empty NEXT_PUBLIC_BACKEND_URL stays '' (relative path → Next.js proxy).
// Only falls back to localhost:8000 when the variable is completely absent (undefined).
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

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
        // Use same-origin request through Next.js rewrite proxy (/api/* → backend)
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

        if (response.status === 409) {
            return { success: false, error: 'An account with this email already exists', status: 409 };
        }

        if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            // Map raw Fastify/AJV schema errors to clean user-facing messages
            const raw: string = errorData.message || '';
            let clean = 'Please check your details and try again.';
            if (/full_name/.test(raw)) clean = 'Please enter your full name (at least 4 characters).';
            else if (/email/.test(raw)) clean = 'Please enter a valid email address.';
            else if (/password/.test(raw)) clean = 'Password does not meet the requirements.';
            return { success: false, error: clean, status: 400 };
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

export async function getMyCourses(): Promise<ApiResponse<Course[]>> {
    if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, data: MOCK_ENROLLED_COURSES };
    }

    try {
        const response = await apiFetch('/api/v1/courses/enrolled');

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
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
    if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, data: MOCK_AVAILABLE_COURSES };
    }

    try {
        const response = await apiFetch('/api/v1/courses/available');

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        return { success: false, error: 'Failed to fetch available courses', status: response.status };
    } catch (error) {
        console.error('Get available courses error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

export async function getActiveSessions(): Promise<ApiResponse<Session[]>> {
    if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, data: MOCK_ACTIVE_SESSIONS };
    }

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

export async function registerForCourse(courseId: string): Promise<ApiResponse<{ message: string }>> {
    if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return { success: true, data: { message: 'Registration submitted for approval' } };
    }

    try {
        const response = await apiFetch('/api/v1/courses/register', {
            method: 'POST',
            body: { course_id: courseId },
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        if (response.status === 409) {
            return { success: false, error: 'Already registered for this course', status: 409 };
        }

        return { success: false, error: 'Failed to register for course', status: response.status };
    } catch (error) {
        console.error('Register course error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}

/** Haversine distance in metres between two lat/lng points */
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6_371_000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function submitAttendance(payload: AttendancePayload): Promise<ApiResponse<AttendanceResult>> {
    if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Look up the session so we can simulate real geofencing
        const session = MOCK_ACTIVE_SESSIONS.find(s => s.id === payload.session_id);

        // Geofencing check (mirrors backend Haversine logic)
        if (
            session?.venue_latitude != null &&
            session?.venue_longitude != null &&
            session?.geofence_radius_meters != null
        ) {
            const distance = haversineMetres(
                payload.location.latitude,
                payload.location.longitude,
                session.venue_latitude,
                session.venue_longitude,
            );
            if (distance > session.geofence_radius_meters) {
                return {
                    success: false,
                    error: 'You are outside the permitted location for this session.',
                    status: 400,
                };
            }
        }

        return {
            success: true,
            data: {
                id: 'mock-checkin-' + Date.now(),
                session_id: payload.session_id,
                student_id: 'mock-student',
                status: 'approved' as const,
                checked_in_at: new Date().toISOString(),
                latitude: payload.location.latitude,
                longitude: payload.location.longitude,
                distance_from_venue_meters: session?.venue_latitude != null
                    ? Math.round(haversineMetres(
                        payload.location.latitude, payload.location.longitude,
                        session.venue_latitude!, session.venue_longitude!,
                    ))
                    : 0,
                liveness_passed: true,
                liveness_score: 0.95,
                risk_score: 0.05,
                risk_factors: [],
            }
        };
    }

    try {
        const response = await apiFetch('/api/v1/checkins', {
            method: 'POST',
            body: {
                session_id: payload.session_id,
                latitude: payload.location.latitude,
                longitude: payload.location.longitude,
                location_accuracy_meters: payload.location.accuracy || 10,
                device_fingerprint: payload.device_fingerprint,
                liveness_challenge_response: payload.liveness_token,
                qr_code: '', // Not implemented yet
            },
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            const raw: string = errorData.message || '';
            let msg = 'Invalid attendance submission.';
            if (/already checked in/i.test(raw)) msg = 'You have already checked into this session.';
            else if (/window closed/i.test(raw)) msg = 'The check-in window for this session has closed.';
            else if (/not active/i.test(raw)) msg = 'This session is not currently active.';
            else if (/geofence/i.test(raw)) msg = 'You are outside the permitted location for this session.';
            else if (/venue location/i.test(raw)) msg = 'This session has no venue configured.';
            return { success: false, error: msg, status: 400 };
        }

        if (response.status === 401) {
            return { success: false, error: 'Please log in first', status: 401 };
        }

        if (response.status === 403) {
            return { success: false, error: 'Face verification failed', status: 403 };
        }

        return { success: false, error: 'Failed to submit attendance', status: response.status };
    } catch (error) {
        console.error('Submit attendance error:', error);
        return { success: false, error: 'Unable to connect to server.' };
    }
}
