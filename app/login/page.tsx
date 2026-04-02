'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import fpPromise from '@fingerprintjs/fingerprintjs';
import { getMyDevices, login, registerDevice } from '@/lib/api';

const DEVICE_BIND_ERROR_KEY = 'saiv_device_bind_error';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Email validation regex
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Validate form before submission
    const validateForm = (): boolean => {
        let isValid = true;
        setEmailError('');
        setPasswordError('');

        if (!email.trim()) {
            setEmailError('Email is required');
            isValid = false;
        } else if (!isValidEmail(email)) {
            setEmailError('Please enter a valid email address');
            isValid = false;
        }

        if (!password) {
            setPasswordError('Password is required');
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const result = await login(email, password);

            if (result.success) {
                // Automatically bind current browser/device after successful login.
                // Pass the access token explicitly because the httpOnly cookie
                // from the login response may not be stored yet (Next.js proxy).
                try {
                    const devResult = await (async () => {
                        const fp = await fpPromise.load();
                        const fpResult = await fp.get();
                        return registerDevice({
                            device_fingerprint: fpResult.visitorId,
                            device_name: navigator?.userAgent ?? 'Browser',
                            platform: 'web',
                        }, result.data?.access_token);
                    })();

                    // Do not block login on device registration failure.
                    // Device-binding is enforced during check-in based on course settings.
                    if (!devResult.success) {
                        console.warn('[SAIV] Device registration after login returned error:', devResult.error);
                        const bindError = (devResult.error || '').toLowerCase();
                        const isFingerprintConflict = devResult.status === 409 || /another account|fingerprint already registered/i.test(bindError);
                        if (isFingerprintConflict) {
                            const devices = await getMyDevices();
                            if (devices.success && (devices.data?.length || 0) > 0) {
                                sessionStorage.removeItem(DEVICE_BIND_ERROR_KEY);
                            } else {
                                sessionStorage.setItem(
                                    DEVICE_BIND_ERROR_KEY,
                                    devResult.error || 'Device registration failed. Check-in may be blocked until this device is bound.'
                                );
                            }
                        } else {
                            sessionStorage.setItem(
                                DEVICE_BIND_ERROR_KEY,
                                devResult.error || 'Device registration failed. Check-in may be blocked until this device is bound.'
                            );
                        }
                    } else {
                        sessionStorage.removeItem(DEVICE_BIND_ERROR_KEY);
                    }
                } catch (err: any) {
                    console.warn('[SAIV] Device registration after login failed:', err);
                    sessionStorage.setItem(
                        DEVICE_BIND_ERROR_KEY,
                        'Device registration failed. Check-in may be blocked until this device is bound.'
                    );
                }

                // Cache user info so dashboard can read the latest display name.
                if (result.data?.user) {
                    sessionStorage.setItem('saiv_user', JSON.stringify(result.data.user));
                }
                if (result.data?.user?.face_enrolled === false) {
                    router.push('/enroll?required=true');
                    return;
                }

                // Redirect to dashboard on successful login
                router.push('/dashboard');
            } else {
                setError(result.error || 'Login failed');
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="login-container">
            {/* Background gradient orbs */}
            <div className="bg-orb bg-orb-1"></div>
            <div className="bg-orb bg-orb-2"></div>
            <div className="bg-orb bg-orb-3"></div>

            <div className="login-card">
                {/* Logo/Brand */}
                <div className="login-header">
                    <div className="logo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="M9 12l2 2 4-4" />
                        </svg>
                    </div>
                    <h1>SAIV</h1>
                    <p className="tagline">Secure Attendance & Identity Verification</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    {/* General Error */}
                    {error && (
                        <div className="error-banner" role="alert">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Email Field */}
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                            </svg>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setEmailError('');
                                }}
                                placeholder="Enter your email"
                                className={emailError ? 'input-error' : ''}
                                disabled={isLoading}
                                autoComplete="email"
                            />
                        </div>
                        {emailError && <span className="field-error">{emailError}</span>}
                    </div>

                    {/* Password Field */}
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setPasswordError('');
                                }}
                                placeholder="Enter your password"
                                className={passwordError ? 'input-error' : ''}
                                disabled={isLoading}
                                autoComplete="current-password"
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

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <span>Sign In</span>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="login-footer">
                    <p>Student Check-in System</p>
                    <p style={{ marginTop: '0.5rem' }}>
                        New here? <Link href="/register" className="register-link">Register</Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
