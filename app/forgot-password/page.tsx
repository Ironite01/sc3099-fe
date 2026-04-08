'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '@/lib/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [emailError, setEmailError] = useState('');

    const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setEmailError('');
        if (!email.trim()) {
            setEmailError('Email is required');
            return;
        }
        if (!isValidEmail(email.trim())) {
            setEmailError('Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        try {
            const result = await requestPasswordReset(email.trim());
            if (result.success) {
                setMessage(result.message || 'If the account exists, a password reset link has been sent.');
                return;
            }
            setError(result.error || 'Failed to request password reset.');
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
                    <h1>Forgot Password</h1>
                    <p className="tagline">Enter your email and we will send a reset link.</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="error-banner"><span>{error}</span></div>}
                    {message && <div className="success-banner"><span>{message}</span></div>}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <div className="input-wrapper">
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setEmailError('');
                                }}
                                placeholder="Enter your email"
                                disabled={isLoading}
                                autoComplete="email"
                            />
                        </div>
                        {emailError && <span className="field-error">{emailError}</span>}
                    </div>

                    <button type="submit" className="login-button auth-compact-button" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div className="login-footer">
                    <p><Link href="/login" className="register-link">Back to Login</Link></p>
                </div>
            </div>
        </main>
    );
}
