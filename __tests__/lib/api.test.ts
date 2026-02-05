/**
 * Tests for API client functions
 * Mocks the fetch API to test different response scenarios
 */

import { login } from '@/lib/api';

// Mock the global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('login', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    it('should return success with user data on successful login', async () => {
        const mockUserData = {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            token_type: 'Bearer',
            user: {
                id: '123',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'student',
            },
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockUserData,
        });

        const result = await login('test@example.com', 'Password123!');

        expect(result).toEqual({
            success: true,
            data: mockUserData,
        });
        expect(mockFetch).toHaveBeenCalledWith(
            '/api/user/login',
            expect.objectContaining({
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'test@example.com', password: 'Password123!' }),
            })
        );
    });

    it('should return error for invalid credentials (401)', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
        });

        const result = await login('test@example.com', 'wrongpassword');

        expect(result).toEqual({
            success: false,
            error: 'Invalid email or password',
            status: 401,
        });
    });

    it('should return error for rate limiting (429)', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 429,
        });

        const result = await login('test@example.com', 'Password123!');

        expect(result).toEqual({
            success: false,
            error: 'Too many attempts, please try later',
            status: 429,
        });
    });

    it('should return error for disabled account (403)', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 403,
        });

        const result = await login('disabled@example.com', 'Password123!');

        expect(result).toEqual({
            success: false,
            error: 'Account is disabled',
            status: 403,
        });
    });

    it('should return generic error for other status codes', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
        });

        const result = await login('test@example.com', 'Password123!');

        expect(result).toEqual({
            success: false,
            error: 'An error occurred. Please try again.',
            status: 500,
        });
    });

    it('should return connection error when fetch throws', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await login('test@example.com', 'Password123!');

        expect(result).toEqual({
            success: false,
            error: 'Unable to connect to server. Please check your connection.',
        });
    });

    it('should send credentials with request', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ user: {} }),
        });

        await login('test@example.com', 'Password123!');

        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                credentials: 'include',
            })
        );
    });
});
