'use client';

import { useRouter } from 'next/navigation';
import AuthCard, { AuthField } from '@/components/AuthCard';
import { register } from '@/lib/api';

// Email validation helper
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// SVG Icons
const EmailIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);

const LockIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const UserIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

export default function RegisterPage() {
    const router = useRouter();

    const fields: AuthField[] = [
        {
            name: 'fullName',
            type: 'text',
            label: 'Full Name',
            placeholder: 'Enter your full name',
            icon: UserIcon,
            autoComplete: 'name',
        },
        {
            name: 'email',
            type: 'email',
            label: 'Email',
            placeholder: 'Enter your email',
            icon: EmailIcon,
            autoComplete: 'email',
            validate: (value) => {
                if (!isValidEmail(value)) {
                    return 'Please enter a valid email address';
                }
                return null;
            },
        },
        {
            name: 'password',
            type: 'password',
            label: 'Password',
            placeholder: 'Create a password',
            icon: LockIcon,
            autoComplete: 'new-password',
            validate: (value) => {
                if (value.length < 8) {
                    return 'Password must be at least 8 characters';
                }
                return null;
            },
        },
        {
            name: 'confirmPassword',
            type: 'password',
            label: 'Confirm Password',
            placeholder: 'Confirm your password',
            icon: LockIcon,
            autoComplete: 'new-password',
            validate: (value, allValues) => {
                if (value !== allValues.password) {
                    return 'Passwords do not match';
                }
                return null;
            },
        },
    ];

    const handleSubmit = async (values: Record<string, string>) => {
        const result = await register(values.email, values.password, values.fullName);

        if (result.success) {
            // Redirect to login after successful registration
            router.push('/login');
        }

        return result;
    };

    return (
        <AuthCard
            title="SAIV"
            subtitle="Create Your Account"
            fields={fields}
            submitLabel="Register"
            onSubmit={handleSubmit}
            footerLink={{
                text: "Already have an account?",
                linkText: "Sign In",
                href: "/login",
            }}
            footerNote="Student Check-in System"
        />
    );
}
