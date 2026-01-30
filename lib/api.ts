const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
    body?: object | string;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
    const { body, headers, ...restOptions } = options;

    const config: RequestInit = {
        ...restOptions,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };

    if (body !== undefined) {
        config.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const url = `${API_BASE_URL}${path}`;
    return fetch(url, config);
}

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
        const response = await apiFetch('/api/user/login', {
            method: 'POST',
            body: { email, password },
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }

        if (response.status === 401) {
            return { success: false, error: 'Invalid email or password', status: 401 };
        }
        if (response.status === 429) {
            return { success: false, error: 'Too many attempts, please try later', status: 429 };
        }
        if (response.status === 403) {
            return { success: false, error: 'Account is disabled', status: 403 };
        }

        return { success: false, error: 'An error occurred. Please try again.', status: response.status };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Unable to connect to server. Please check your connection.' };
    }
}

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

export async function register(
    email: string,
    password: string,
    fullName: string
): Promise<{
    success: boolean;
    error?: string;
    status?: number;
}> {
    try {
        const response = await apiFetch('/api/user', {
            method: 'POST',
            body: { email, password, full_name: fullName },
        });

        if (response.ok) {
            return { success: true };
        }

        if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            return { success: false, error: errorData.detail || 'Invalid registration data', status: 400 };
        }
        if (response.status === 409) {
            return { success: false, error: 'An account with this email already exists', status: 409 };
        }

        return { success: false, error: 'An error occurred. Please try again.', status: response.status };
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: 'Unable to connect to server. Please check your connection.' };
    }
}
