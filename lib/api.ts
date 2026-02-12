/**
 * API Helper for SAIV Frontend
 * 
 * Provides a reusable fetch wrapper that:
 * - Prepends NEXT_PUBLIC_BACKEND_URL to all paths
 * - Always includes credentials for HttpOnly cookie auth
 * - Sets JSON headers by default
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

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
        // Use same-origin request through Next.js rewrite proxy
        const response = await fetch('/user/login', {
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

import type { Course, AttendancePayload, AttendanceResult, ApiResponse } from './types';
import { MOCK_ENROLLED_COURSES, MOCK_AVAILABLE_COURSES, USE_MOCK_DATA } from './mockData';

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

export async function submitAttendance(payload: AttendancePayload): Promise<ApiResponse<AttendanceResult>> {
    if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const course = MOCK_ENROLLED_COURSES.find(c => c.id === payload.course_id);
        return {
            success: true,
            data: {
                success: true,
                message: 'Attendance recorded successfully',
                timestamp: new Date().toISOString(),
                course_name: course?.name || 'Unknown Course',
            }
        };
    }

    try {
        const response = await apiFetch('/api/v1/attendance/submit', {
            method: 'POST',
            body: payload,
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.detail || 'Invalid attendance submission',
                status: 400
            };
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
