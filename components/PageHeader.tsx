'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    showBack?: boolean;
    backHref?: string;
    rightAction?: React.ReactNode;
}

export default function PageHeader({
    title,
    showBack = true,
    backHref,
    rightAction
}: PageHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        if (backHref) {
            router.push(backHref);
        } else {
            router.back();
        }
    };

    return (
        <header className="page-header">
            <div className="page-header-left">
                {showBack && (
                    <button
                        onClick={handleBack}
                        className="back-button"
                        aria-label="Go back"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}
            </div>
            <h1 className="page-header-title">{title}</h1>
            <div className="page-header-right">
                {rightAction}
            </div>
        </header>
    );
}
