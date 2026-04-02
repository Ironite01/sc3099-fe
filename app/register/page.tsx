'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import fpPromise from '@fingerprintjs/fingerprintjs';
import { getMyDevices, register, login, registerDevice } from '@/lib/api';

const DEVICE_BIND_ERROR_KEY = 'saiv_device_bind_error';

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [fullNameError, setFullNameError] = useState('');

    // Email validation regex
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Name validation: letters (ASCII + Latin accents), spaces, hyphens, apostrophes, dots — 2–50 chars
    const isValidFullName = (name: string): boolean => {
        return /^[A-Za-zÀ-ÖØ-öø-ÿ\s\.\-']+$/.test(name.trim()) && name.trim().length >= 2 && name.trim().length <= 50;
    };

    // Password strength: 0–4 based on rules met
    const getPasswordStrength = (pwd: string): number => {
        let score = 0;
        if (pwd.length >= 8) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[a-z]/.test(pwd)) score++;
        if (/[^a-zA-Z0-9]/.test(pwd)) score++;
        return score;
    };

    const pwdStrength = getPasswordStrength(password);

    // Validate form before submission
    const validateForm = (): boolean => {
        let isValid = true;
        setEmailError('');
        setPasswordError('');
        setConfirmPasswordError('');
        setFullNameError('');

        if (!fullName.trim()) {
            setFullNameError('Full name is required');
            isValid = false;
        } else if (fullName.trim().length < 4) {
            setFullNameError('Name must be at least 4 characters');
            isValid = false;
        } else if (fullName.trim().length > 50) {
            setFullNameError('Name must be 50 characters or fewer');
            isValid = false;
        } else if (!isValidFullName(fullName)) {
            setFullNameError('Name may only contain letters, spaces, hyphens, apostrophes, or dots');
            isValid = false;
        }

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
        } else if (password.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            isValid = false;
        } else if (!/[A-Z]/.test(password)) {
            setPasswordError('Password must include at least one uppercase letter (A–Z)');
            isValid = false;
        } else if (!/[a-z]/.test(password)) {
            setPasswordError('Password must include at least one lowercase letter (a–z)');
            isValid = false;
        } else if (!/[^a-zA-Z0-9]/.test(password)) {
            setPasswordError('Password must include at least one special character (e.g. !@#$%)');
            isValid = false;
        }

        if (!confirmPassword) {
            setConfirmPasswordError('Please confirm your password');
            isValid = false;
        } else if (password !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match');
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
            const result = await register({
                email,
                password,
                full_name: fullName,
                role: 'student',
            });

            if (result.success) {
                // Auto-login then redirect to face enrollment (Step 2 of sign up)
                const loginResult = await login(email, password);
                if (loginResult.success) {
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
                            }, loginResult.data?.access_token);
                        })();
                        if (!devResult.success) {
                            console.warn('[SAIV] Device registration after register returned error:', devResult.error);
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
                    } catch (err) {
                        console.warn('[SAIV] Device registration after register failed:', err);
                        sessionStorage.setItem(
                            DEVICE_BIND_ERROR_KEY,
                            'Device registration failed. Check-in may be blocked until this device is bound.'
                        );
                    }
                    router.push('/enroll?fromRegister=true&required=true');
                } else {
                    // Registration succeeded but auto-login failed – fall back to login page
                    router.push('/login?registered=true');
                }
            } else {
                setError(result.error || 'Registration failed');
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const goToLogin = () => {
        router.push('/login');
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
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <line x1="19" y1="8" x2="19" y2="14" />
                            <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                    </div>
                    <h1>Create Account</h1>
                    <p className="tagline">Join SAIV for secure attendance tracking</p>
                </div>

                {/* Register Form */}
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

                    {/* Full Name Field */}
                    <div className="form-group">
                        <label htmlFor="fullName">Full Name</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <input
                                type="text"
                                id="fullName"
                                value={fullName}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFullName(val);
                                    if (val.trim() && !isValidFullName(val)) {
                                        setFullNameError('Name may only contain letters, spaces, hyphens, apostrophes, or dots');
                                    } else {
                                        setFullNameError('');
                                    }
                                }}
                                placeholder="Enter your full name"
                                className={fullNameError ? 'input-error' : ''}
                                disabled={isLoading}
                                autoComplete="name"
                            />
                        </div>
                        {fullNameError && <span className="field-error">{fullNameError}</span>}
                    </div>

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
                                placeholder="Enter your email address"
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
                                placeholder="Create a strong password"
                                className={passwordError ? 'input-error' : ''}
                                disabled={isLoading}
                                autoComplete="new-password"
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
                        {password && !passwordError && pwdStrength < 4 && (
                            <p className="password-hint">
                                Use 8+ characters with uppercase, lowercase, a number &amp; a symbol.
                            </p>
                        )}
                    </div>

                    {/* Confirm Password Field */}
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setConfirmPasswordError('');
                                }}
                                placeholder="Confirm your password"
                                className={confirmPasswordError ? 'input-error' : ''}
                                disabled={isLoading}
                                autoComplete="new-password"
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
                        {confirmPasswordError && <span className="field-error">{confirmPasswordError}</span>}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                        style={{ marginTop: '0.5rem' }}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                <span>Creating account...</span>
                            </>
                        ) : (
                            <span>Sign Up</span>
                        )}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                        Already have an account?{' '}
                        <button
                            type="button"
                            onClick={goToLogin}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#38bdf8',
                                cursor: 'pointer',
                                fontWeight: 500,
                                padding: 0,
                                fontSize: '0.9rem'
                            }}
                        >
                            Sign In
                        </button>
                    </div>
                </form>

                {/* Footer */}
                <div className="login-footer">
                    <p>Student Check-in System</p>
                </div>
            </div>
        </main>
    );
}
