'use client';

import { useState } from 'react';

interface CheckInButtonProps {
    sessionId: string;
    sessionName: string;
    onCheckIn: (sessionId: string) => Promise<void>;
    disabled?: boolean;
}

export default function CheckInButton({
    sessionId,
    sessionName,
    onCheckIn,
    disabled = false,
}: CheckInButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
        if (disabled || isLoading) return;

        setIsLoading(true);
        try {
            await onCheckIn(sessionId);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={disabled || isLoading}
            className="check-in-button"
            aria-label={`Check in to ${sessionName}`}
        >
            {isLoading ? (
                <>
                    <span className="spinner"></span>
                    <span>Checking in...</span>
                </>
            ) : (
                <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <polyline points="9 12 11 14 15 10" />
                    </svg>
                    <span>Check In</span>
                </>
            )}
        </button>
    );
}
