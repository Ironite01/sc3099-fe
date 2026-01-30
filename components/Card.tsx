'use client';

import { ReactNode } from 'react';

export interface CardProps {
    title: string;
    subtitle: string;
    children: ReactNode;
    icon?: ReactNode;
    footerContent?: ReactNode;
}

// Default SAIV shield icon
const DefaultIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
    </svg>
);

export default function Card({
    title,
    subtitle,
    children,
    icon = DefaultIcon,
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
                    <div className="logo">{icon}</div>
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
