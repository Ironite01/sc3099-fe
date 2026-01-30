'use client';

import { useState, FormEvent, ReactNode } from 'react';

export interface AuthField {
    name: string;
    type: string;
    label: string;
    placeholder: string;
    icon: ReactNode;
    autoComplete?: string;
    validate?: (value: string, allValues: Record<string, string>) => string | null;
}

export interface AuthCardProps {
    title: string;
    subtitle: string;
    fields: AuthField[];
    submitLabel: string;
    onSubmit: (values: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
    footerLink?: {
        text: string;
        linkText: string;
        href: string;
    };
    footerNote?: string;
}

export default function AuthCard({
    title,
    subtitle,
    fields,
    submitLabel,
    onSubmit,
    footerLink,
    footerNote,
}: AuthCardProps) {
    const [values, setValues] = useState<Record<string, string>>(
        fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {})
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [generalError, setGeneralError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (name: string, value: string) => {
        setValues((prev) => ({ ...prev, [name]: value }));
        // Clear field error on change
        if (errors[name]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        fields.forEach((field) => {
            const value = values[field.name] || '';

            // Required check
            if (!value.trim()) {
                newErrors[field.name] = `${field.label} is required`;
                isValid = false;
            } else if (field.validate) {
                // Custom validation
                const error = field.validate(value, values);
                if (error) {
                    newErrors[field.name] = error;
                    isValid = false;
                }
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setGeneralError('');

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const result = await onSubmit(values);

            if (!result.success) {
                setGeneralError(result.error || 'An error occurred');
            }
        } catch {
            setGeneralError('An unexpected error occurred');
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
                {/* Header */}
                <div className="login-header">
                    <div className="logo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="M9 12l2 2 4-4" />
                        </svg>
                    </div>
                    <h1>{title}</h1>
                    <p className="tagline">{subtitle}</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    {/* General Error */}
                    {generalError && (
                        <div className="error-banner" role="alert">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{generalError}</span>
                        </div>
                    )}

                    {/* Dynamic Fields */}
                    {fields.map((field) => (
                        <div key={field.name} className="form-group">
                            <label htmlFor={field.name}>{field.label}</label>
                            <div className="input-wrapper">
                                <span className="input-icon">{field.icon}</span>
                                <input
                                    type={field.type}
                                    id={field.name}
                                    value={values[field.name]}
                                    onChange={(e) => handleChange(field.name, e.target.value)}
                                    placeholder={field.placeholder}
                                    className={errors[field.name] ? 'input-error' : ''}
                                    disabled={isLoading}
                                    autoComplete={field.autoComplete}
                                />
                            </div>
                            {errors[field.name] && <span className="field-error">{errors[field.name]}</span>}
                        </div>
                    ))}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                <span>Please wait...</span>
                            </>
                        ) : (
                            <span>{submitLabel}</span>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="login-footer">
                    {footerLink && (
                        <p className="auth-link">
                            {footerLink.text}{' '}
                            <a href={footerLink.href}>{footerLink.linkText}</a>
                        </p>
                    )}
                    {footerNote && <p>{footerNote}</p>}
                </div>
            </div>
        </main>
    );
}
