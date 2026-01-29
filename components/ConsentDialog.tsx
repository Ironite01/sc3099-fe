'use client';

import { useState } from 'react';

interface ConsentDialogProps {
    type: 'camera' | 'geolocation';
    isOpen: boolean;
    onAccept: () => void;
    onDecline: () => void;
}

export default function ConsentDialog({ type, isOpen, onAccept, onDecline }: ConsentDialogProps) {
    if (!isOpen) return null;

    const content = {
        camera: {
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                </svg>
            ),
            title: 'Camera Permission Required',
            description:
                'To verify your identity for check-in, we need access to your camera. Your face image will be securely processed and only a mathematical representation will be stored.',
            points: [
                'Used only for identity verification',
                'Face image is not permanently stored',
                'Processed securely with encryption',
                'You can revoke access anytime',
            ],
        },
        geolocation: {
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                </svg>
            ),
            title: 'Location Permission Required',
            description:
                'To verify you are physically present at the session location, we need access to your device location. This ensures attendance integrity.',
            points: [
                'Used to verify physical presence',
                'Location checked only during check-in',
                'Not tracked outside of check-in',
                'You can revoke access anytime',
            ],
        },
    };

    const { icon, title, description, points } = content[type];

    return (
        <div className="consent-overlay" role="dialog" aria-modal="true" aria-labelledby="consent-title">
            <div className="consent-dialog">
                <div className="consent-content">
                    <div className="consent-icon">{icon}</div>
                    <h2 id="consent-title" className="consent-title">
                        {title}
                    </h2>
                    <p className="consent-description">{description}</p>

                    <ul className="consent-points">
                        {points.map((point, index) => (
                            <li key={index}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="consent-notice">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <p>
                            By clicking &quot;Allow Access&quot;, you consent to the use of your {type} as described in
                            our <a href="/privacy" className="privacy-link">Privacy Policy</a>.
                        </p>
                    </div>
                </div>

                <div className="consent-actions">
                    <button onClick={onDecline} className="consent-button decline">
                        Decline
                    </button>
                    <button onClick={onAccept} className="consent-button accept">
                        Allow Access
                    </button>
                </div>
            </div>
        </div>
    );
}
