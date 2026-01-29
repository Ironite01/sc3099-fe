/**
 * Tests for API utility functions
 */

import {
    apiFetch,
    login,
    register,
    enrollFace,
    updateConsent,
    getCurrentUser,
    getActiveSessions,
    submitCheckIn,
    getCheckInHistory,
    getEnrolledCourses,
    logout,
} from '../api';

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('API Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('apiFetch', () => {
        it('should make a request with correct URL and headers', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: 'test' }),
            } as Response);

            await apiFetch('/api/v1/test');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/test'),
                expect.objectContaining({
                    credentials: 'include',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                })
            );
        });

        it('should stringify object body', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            } as Response);

            await apiFetch('/api/v1/test', {
                method: 'POST',
                body: { key: 'value' },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify({ key: 'value' }),
                })
            );
        });

        it('should pass string body as-is', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            } as Response);

            await apiFetch('/api/v1/test', {
                method: 'POST',
                body: 'raw string',
            });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: 'raw string',
                })
            );
        });
    });

    describe('login', () => {
        it('should return success with user data on successful login', async () => {
            const mockUserData = {
                access_token: 'token123',
                refresh_token: 'refresh123',
                token_type: 'bearer',
                user: {
                    id: '1',
                    email: 'test@example.com',
                    full_name: 'Test User',
                    role: 'student',
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUserData,
            } as Response);

            const result = await login('test@example.com', 'password123');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockUserData);
        });

        it('should return error for invalid credentials (401)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
            } as Response);

            const result = await login('test@example.com', 'wrong');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid email or password');
            expect(result.status).toBe(401);
        });

        it('should return error for rate limiting (429)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
            } as Response);

            const result = await login('test@example.com', 'password');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Too many attempts, please try later');
            expect(result.status).toBe(429);
        });

        it('should return error for disabled account (403)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
            } as Response);

            const result = await login('test@example.com', 'password');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Account is disabled');
            expect(result.status).toBe(403);
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await login('test@example.com', 'password');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unable to connect to server. Please check your connection.');
        });
    });

    describe('register', () => {
        it('should return success with user data on successful registration', async () => {
            const mockUserData = {
                id: '1',
                email: 'new@example.com',
                full_name: 'New User',
                role: 'student',
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUserData,
            } as Response);

            const result = await register('new@example.com', 'password123', 'New User');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockUserData);
        });

        it('should return error for duplicate email (409)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 409,
            } as Response);

            const result = await register('existing@example.com', 'password', 'User');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Email already registered');
            expect(result.status).toBe(409);
        });

        it('should return error for invalid data (400)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({ detail: 'Password too weak' }),
            } as Response);

            const result = await register('test@example.com', '123', 'User');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Password too weak');
            expect(result.status).toBe(400);
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await register('test@example.com', 'password', 'User');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unable to connect to server. Please check your connection.');
        });
    });

    describe('enrollFace', () => {
        it('should return success on successful face enrollment', async () => {
            const mockData = {
                message: 'Face enrolled successfully',
                face_enrolled: true,
                quality_score: 0.95,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockData,
            } as Response);

            const result = await enrollFace('base64imagedata');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockData);
        });

        it('should return error when no face detected (400)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({ detail: 'No face detected in image' }),
            } as Response);

            const result = await enrollFace('invalidimage');

            expect(result.success).toBe(false);
            expect(result.error).toBe('No face detected in image');
            expect(result.status).toBe(400);
        });

        it('should return error when not authenticated (401)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
            } as Response);

            const result = await enrollFace('base64image');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Please log in first');
            expect(result.status).toBe(401);
        });

        it('should return error when face service unavailable (503)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 503,
            } as Response);

            const result = await enrollFace('base64image');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Face recognition service unavailable');
            expect(result.status).toBe(503);
        });
    });

    describe('updateConsent', () => {
        it('should return success when consent updated', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            } as Response);

            const result = await updateConsent(true, true);

            expect(result.success).toBe(true);
        });

        it('should only include provided consent values in request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            } as Response);

            await updateConsent(true);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify({ camera_consent: true }),
                })
            );
        });

        it('should return error on failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            } as Response);

            const result = await updateConsent(true);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to update consent settings');
        });
    });

    describe('getCurrentUser', () => {
        it('should return user data on success', async () => {
            const mockUser = {
                id: '1',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'student',
                face_enrolled: true,
                camera_consent: true,
                geolocation_consent: true,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser,
            } as Response);

            const result = await getCurrentUser();

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockUser);
        });

        it('should return error when not authenticated (401)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
            } as Response);

            const result = await getCurrentUser();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Not authenticated');
        });
    });

    describe('getActiveSessions', () => {
        it('should return active sessions list', async () => {
            const mockSessions = [
                {
                    id: '1',
                    course_name: 'CS101',
                    session_type: 'lecture',
                    start_time: '2024-01-15T10:00:00Z',
                    end_time: '2024-01-15T11:00:00Z',
                    location_lat: 1.3521,
                    location_lon: 103.8198,
                    location_radius_m: 100,
                    allow_late_checkin: true,
                    late_checkin_minutes: 15,
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockSessions,
            } as Response);

            const result = await getActiveSessions();

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockSessions);
        });

        it('should return error when not authenticated', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
            } as Response);

            const result = await getActiveSessions();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Not authenticated');
        });
    });

    describe('submitCheckIn', () => {
        const checkInParams = {
            sessionId: 'session1',
            imageBase64: 'base64image',
            latitude: 1.3521,
            longitude: 103.8198,
            deviceFingerprint: 'fingerprint123',
            devicePublicKey: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
        };

        it('should return success on successful check-in', async () => {
            const mockData = {
                id: 'checkin1',
                session_id: 'session1',
                risk_score: 0.2,
                status: 'approved',
                face_match_confidence: 0.95,
                liveness_score: 0.98,
                location_verified: true,
                device_trusted: true,
                check_in_time: '2024-01-15T10:05:00Z',
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockData,
            } as Response);

            const result = await submitCheckIn(checkInParams);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockData);
        });

        it('should return error for session not found (404)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
            } as Response);

            const result = await submitCheckIn(checkInParams);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Session not found');
            expect(result.status).toBe(404);
        });

        it('should return error for already checked in (409)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 409,
            } as Response);

            const result = await submitCheckIn(checkInParams);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Already checked in');
            expect(result.status).toBe(409);
        });

        it('should return error for check-in not allowed (403)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                json: async () => ({ detail: 'Outside geofence' }),
            } as Response);

            const result = await submitCheckIn(checkInParams);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Outside geofence');
            expect(result.status).toBe(403);
        });
    });

    describe('getCheckInHistory', () => {
        it('should return check-in history', async () => {
            const mockHistory = [
                {
                    id: 'checkin1',
                    session_id: 'session1',
                    course_name: 'CS101',
                    session_type: 'lecture',
                    check_in_time: '2024-01-15T10:05:00Z',
                    risk_score: 0.2,
                    status: 'approved',
                    face_match_confidence: 0.95,
                    liveness_score: 0.98,
                    location_verified: true,
                    device_trusted: true,
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistory,
            } as Response);

            const result = await getCheckInHistory(10);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockHistory);
        });

        it('should include limit in query string', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [],
            } as Response);

            await getCheckInHistory(5);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('limit=5'),
                expect.any(Object)
            );
        });
    });

    describe('getEnrolledCourses', () => {
        it('should return enrolled courses', async () => {
            const mockCourses = [
                {
                    id: 'course1',
                    course_code: 'CS101',
                    course_name: 'Intro to CS',
                    enrolled_at: '2024-01-01T00:00:00Z',
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockCourses,
            } as Response);

            const result = await getEnrolledCourses();

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockCourses);
        });
    });

    describe('logout', () => {
        it('should return success on successful logout', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            } as Response);

            const result = await logout();

            expect(result.success).toBe(true);
        });

        it('should return error on failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            } as Response);

            const result = await logout();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Logout failed');
        });
    });
});
