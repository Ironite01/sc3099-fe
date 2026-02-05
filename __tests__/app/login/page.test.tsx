/**
 * Tests for Login Page component
 * Mocks API responses and tests user interactions
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/login/page';
import * as api from '@/lib/api';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

// Mock the API module
jest.mock('@/lib/api');
const mockLogin = api.login as jest.MockedFunction<typeof api.login>;

describe('LoginPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render login form with email and password fields', () => {
        render(<LoginPage />);

        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render title and subtitle', () => {
        render(<LoginPage />);

        expect(screen.getByText('SAIV')).toBeInTheDocument();
        expect(screen.getByText('Secure Attendance & Identity Verification')).toBeInTheDocument();
    });

    it('should render link to registration page', () => {
        render(<LoginPage />);

        expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /register/i })).toHaveAttribute('href', '/register');
    });

    it('should not call login API with invalid email', async () => {
        const user = userEvent.setup();
        render(<LoginPage />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        await user.type(emailInput, 'invalid-email');
        await user.type(passwordInput, 'somepassword');
        await user.click(submitButton);

        // Wait for any async validation to complete
        await waitFor(() => {
            // The login API should not be called when validation fails
            expect(mockLogin).not.toHaveBeenCalled();
        });
    });

    it('should show validation error for empty fields', async () => {
        const user = userEvent.setup();
        render(<LoginPage />);

        const submitButton = screen.getByRole('button', { name: /sign in/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        });
    });

    it('should call login API and redirect on success', async () => {
        mockLogin.mockResolvedValueOnce({
            success: true,
            data: {
                access_token: 'token',
                refresh_token: 'refresh',
                token_type: 'Bearer',
                user: {
                    id: '1',
                    email: 'test@example.com',
                    full_name: 'Test User',
                    role: 'student',
                },
            },
        });

        const user = userEvent.setup();
        render(<LoginPage />);

        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'Password123!');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'Password123!');
            expect(mockPush).toHaveBeenCalledWith('/');
        });
    });

    it('should display error message on login failure', async () => {
        mockLogin.mockResolvedValueOnce({
            success: false,
            error: 'Invalid email or password',
            status: 401,
        });

        const user = userEvent.setup();
        render(<LoginPage />);

        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
        });
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('should display rate limit error', async () => {
        mockLogin.mockResolvedValueOnce({
            success: false,
            error: 'Too many attempts, please try later',
            status: 429,
        });

        const user = userEvent.setup();
        render(<LoginPage />);

        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'Password123!');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
        });
    });

    it('should display network error', async () => {
        mockLogin.mockResolvedValueOnce({
            success: false,
            error: 'Unable to connect to server. Please check your connection.',
        });

        const user = userEvent.setup();
        render(<LoginPage />);

        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'Password123!');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText(/unable to connect to server/i)).toBeInTheDocument();
        });
    });

    it('should disable form during submission', async () => {
        mockLogin.mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve({ success: true, data: {} as any }), 100))
        );

        const user = userEvent.setup();
        render(<LoginPage />);

        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'Password123!');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        expect(screen.getByLabelText(/email/i)).toBeDisabled();
        expect(screen.getByLabelText(/password/i)).toBeDisabled();
        expect(screen.getByRole('button')).toBeDisabled();
        expect(screen.getByText(/please wait/i)).toBeInTheDocument();
    });
});
