'use client';

import { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

interface CardProps {
    title: string;
    subtitle: string;
    children: ReactNode;
    icon?: ReactNode;
    footerContent?: ReactNode;
}

export default function Card({
    title,
    subtitle,
    children,
    icon,
    footerContent,
}: CardProps) {
    return (
        <main className="login-container">
            {/* Background gradient orbs */}
            <div className="bg-orb bg-orb-1"></div>
            <div className="bg-orb bg-orb-2"></div>
            <div className="bg-orb bg-orb-3"></div>

            <div className="login-card">
                {/* Header */}
                <div className="login-header">
                    {icon !== undefined && <div className="logo">{icon}</div>}
                    {icon === undefined && <div className="logo"><ShieldCheck size={48} /></div>}
                    <h1>{title}</h1>
                    <p className="tagline">{subtitle}</p>
                </div>

                {/* Content */}
                <div className="card-content">
                    {children}
                </div>

                {/* Footer */}
                {footerContent && (
                    <div className="login-footer">
                        {footerContent}
                    </div>
                )}
            </div>
        </main>
    );
}
