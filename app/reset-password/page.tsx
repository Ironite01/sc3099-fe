'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { resetPassword } from '@/lib/api';

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    const validatePassword = (value: string): string => {
        if (value.length < 8) return 'Password must be at least 8 characters.';
        return '';
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setPasswordError('');
        setConfirmPasswordError('');

        if (!token) {
            setError('Reset token is missing.');
            return;
        }
        const pwdErr = validatePassword(password);
        if (pwdErr) {
            setPasswordError(pwdErr);
            return;
        }
        if (password !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await resetPassword(token, password);
            if (result.success) {
                setMessage(result.message || 'Password reset successful. Redirecting to login...');
                setTimeout(() => router.push('/login'), 1200);
                return;
            }
            setError(result.error || 'Failed to reset password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="login-container">
            <div className="bg-orb bg-orb-1"></div>
            <div className="bg-orb bg-orb-2"></div>
            <div className="bg-orb bg-orb-3"></div>

            <div className="login-card">
                <div className="login-header">
                    <h1>Reset Password</h1>
                    <p className="tagline">Set a new password for your account.</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="error-banner"><span>{error}</span></div>}
                    {message && <div className="success-banner"><span>{message}</span></div>}

                    <div className="form-group">
                        <label htmlFor="password">New Password</label>
                        <div className="input-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setPasswordError('');
                                }}
                                placeholder="Enter new password"
                                disabled={isLoading}
                                autoComplete="new-password"
                                className={passwordError ? 'input-error' : ''}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="toggle-password-btn"
                                tabIndex={-1}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {passwordError && <span className="field-error">{passwordError}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <div className="input-wrapper">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setConfirmPasswordError('');
                                }}
                                placeholder="Confirm password"
                                disabled={isLoading}
                                autoComplete="new-password"
                                className={confirmPasswordError ? 'input-error' : ''}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="toggle-password-btn"
                                tabIndex={-1}
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {confirmPasswordError && <span className="field-error">{confirmPasswordError}</span>}
                    </div>

                    <button type="submit" className="login-button auth-compact-button" disabled={isLoading}>
                        {isLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>

                <div className="login-footer">
                    <p><Link href="/login" className="register-link">Back to Login</Link></p>
                </div>
            </div>
        </main>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<main className="login-container"></main>}>
            <ResetPasswordContent />
        </Suspense>
    );
}
