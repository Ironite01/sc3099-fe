'use client';

import { ReactNode } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';
import Card from './Card';

export interface AuthField {
    name: string;
    type: string;
    label: string;
    placeholder: string;
    icon: ReactNode;
    autoComplete?: string;
    validate?: (value: string, formValues: Record<string, string>) => string | true;
}

interface AuthCardProps {
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
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<Record<string, string>>();

    const processSubmit: SubmitHandler<Record<string, string>> = async (data) => {
        const result = await onSubmit(data);
        if (!result.success) {
            setError('root', { message: result.error || 'An error occurred' });
        }
    };

    const footerContent = (
        <>
            {footerLink && (
                <p className="auth-link">
                    {footerLink.text}{' '}
                    <a href={footerLink.href}>{footerLink.linkText}</a>
                </p>
            )}
            {footerNote && <p>{footerNote}</p>}
        </>
    );

    return (
        <Card
            title={title}
            subtitle={subtitle}
            footerContent={footerContent}
        >
            <form onSubmit={handleSubmit(processSubmit)} className="login-form">
                {errors.root && (
                    <div className="error-banner" role="alert">
                        <AlertCircle size={20} />
                        <span>{errors.root.message}</span>
                    </div>
                )}

                {fields.map((field) => (
                    <div key={field.name} className="form-group">
                        <label htmlFor={field.name}>{field.label}</label>
                        <div className="input-wrapper">
                            <span className="input-icon">{field.icon}</span>
                            <input
                                type={field.type}
                                id={field.name}
                                placeholder={field.placeholder}
                                className={errors[field.name] ? 'input-error' : ''}
                                disabled={isSubmitting}
                                autoComplete={field.autoComplete}
                                {...register(field.name, {
                                    required: `${field.label} is required`,
                                    validate: field.validate
                                        ? (value, formValues) => {
                                            const result = field.validate!(value, formValues);
                                            return result === true ? true : result;
                                        }
                                        : undefined,
                                })}
                            />
                        </div>
                        {errors[field.name] && (
                            <span className="field-error">{errors[field.name]?.message}</span>
                        )}
                    </div>
                ))}

                <button
                    type="submit"
                    className="login-button"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <span className="spinner"></span>
                            <span>Please wait...</span>
                        </>
                    ) : (
                        <span>{submitLabel}</span>
                    )}
                </button>
            </form>
        </Card>
    );
}
