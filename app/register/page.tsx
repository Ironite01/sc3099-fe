'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/api';

export default function RegisterPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('student');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [fullNameError, setFullNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    // Email validation regex
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Password validation
    const isValidPassword = (password: string): boolean => {
        return password.length >= 8;
    };

    // Validate form before submission
    const validateForm = (): boolean => {
        let isValid = true;
        setFullNameError('');
        setEmailError('');
        setPasswordError('');
        setConfirmPasswordError('');

        if (!fullName.trim()) {
            setFullNameError('Full name is required');
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
        } else if (!isValidPassword(password)) {
            setPasswordError('Password must be at least 8 characters');
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
            const result = await register(email, password, fullName, role);

            if (result.success) {
                // Redirect to login page after successful registration
                router.push('/login?registered=true');
            } else {
                setError(result.error || 'Registration failed');
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
                            <path d="M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                            <path d="M12 10v3" />
                        </svg>
                    </div>
                    <h1>Create Account</h1>
                    <p className="tagline">Register for SAIV attendance system</p>
                </div>

                {/* Registration Form */}
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
                            <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            <input
                                type="text"
                                id="fullName"
                                value={fullName}
                                onChange={(e) => {
                                    setFullName(e.target.value);
                                    setFullNameError('');
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
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setPasswordError('');
                                }}
                                placeholder="At least 8 characters"
                                className={passwordError ? 'input-error' : ''}
                                disabled={isLoading}
                                autoComplete="new-password"
                            />
                        </div>
                        {passwordError && <span className="field-error">{passwordError}</span>}
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
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setConfirmPasswordError('');
                                }}
                                placeholder="Re-enter your password"
                                className={confirmPasswordError ? 'input-error' : ''}
                                disabled={isLoading}
                                autoComplete="new-password"
                            />
                        </div>
                        {confirmPasswordError && <span className="field-error">{confirmPasswordError}</span>}
                    </div>

                    {/* Role Selection */}
                    <div className="form-group">
                        <label htmlFor="role">Role</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <polyline points="17 11 19 13 23 9" />
                            </svg>
                            <select
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                disabled={isLoading}
                                className="role-select"
                            >
                                <option value="student">Student</option>
                                <option value="instructor">Instructor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
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
                                <span>Creating account...</span>
                            </>
                        ) : (
                            <span>Create Account</span>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="login-footer">
                    <p>
                        Already have an account?{' '}
                        <a href="/login" className="register-link">
                            Sign in here
                        </a>
                    </p>
                </div>
            </div>
        </main>
    );
}
