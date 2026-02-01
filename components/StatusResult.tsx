'use client';

import { CheckCircle, XCircle, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StatusResultProps {
    success: boolean;
    title: string;
    message: string;
    details?: string;
    showHomeButton?: boolean;
    homeHref?: string;
    onRetry?: () => void;
}

export default function StatusResult({
    success,
    title,
    message,
    details,
    showHomeButton = true,
    homeHref = '/',
    onRetry,
}: StatusResultProps) {
    const router = useRouter();

    return (
        <div className="status-result">
            <div className={`status-icon-wrapper ${success ? 'status-success' : 'status-error'}`}>
                {success ? (
                    <CheckCircle size={64} />
                ) : (
                    <XCircle size={64} />
                )}
            </div>

            <h2 className="status-title">{title}</h2>
            <p className="status-message">{message}</p>

            {details && (
                <p className="status-details">{details}</p>
            )}

            <div className="status-actions">
                {!success && onRetry && (
                    <button className="secondary-button" onClick={onRetry}>
                        Try Again
                    </button>
                )}
                {showHomeButton && (
                    <button
                        className="primary-button"
                        onClick={() => router.push(homeHref)}
                    >
                        <Home size={18} />
                        Return Home
                    </button>
                )}
            </div>
        </div>
    );
}
