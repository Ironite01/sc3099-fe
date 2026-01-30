'use client';

import { ReactNode } from 'react';

interface FooterProps {
    children?: ReactNode;
}

export default function Footer({ children }: FooterProps) {
    return (
        <footer className="app-footer">
            {children || (
                <p>© 2026 SAIV - Secure Attendance & Identity Verification</p>
            )}
        </footer>
    );
}
