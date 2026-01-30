'use client';

import { useRouter } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';
import AuthCard, { AuthField } from '@/components/AuthCard';
import { login } from '@/lib/api';
import { validateEmail } from '@/lib/validation';

export default function LoginPage() {
    const router = useRouter();

    const fields: AuthField[] = [
        {
            name: 'email',
            type: 'email',
            label: 'Email',
            placeholder: 'Enter your email',
            icon: <Mail size={20} />,
            autoComplete: 'email',
            validate: validateEmail,
        },
        {
            name: 'password',
            type: 'password',
            label: 'Password',
            placeholder: 'Enter your password',
            icon: <Lock size={20} />,
            autoComplete: 'current-password',
        },
    ];

    const handleSubmit = async (values: Record<string, string>) => {
        const result = await login(values.email, values.password);

        if (result.success) {
            router.push('/');
        }

        return result;
    };

    return (
        <AuthCard
            title="SAIV"
            subtitle="Secure Attendance & Identity Verification"
            fields={fields}
            submitLabel="Sign In"
            onSubmit={handleSubmit}
            footerLink={{
                text: "Don't have an account?",
                linkText: "Register",
                href: "/register",
            }}
        />
    );
}
