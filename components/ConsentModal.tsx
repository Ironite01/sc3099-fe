'use client';

import { Camera, MapPin, Shield } from 'lucide-react';

interface ConsentModalProps {
    requireCamera?: boolean;
    requireLocation?: boolean;
    onAccept: () => void;
    onDecline?: () => void;
    isLoading?: boolean;
}

export default function ConsentModal({
    requireCamera = true,
    requireLocation = true,
    onAccept,
    onDecline,
    isLoading = false,
}: ConsentModalProps) {
    return (
        <div className="consent-modal">
            <div className="consent-icon-wrapper">
                <Shield size={48} className="consent-shield-icon" />
            </div>

            <h2>Permission Required</h2>

            <p className="consent-description">
                To verify your attendance, we need access to the following:
            </p>

            <ul className="consent-permissions-list">
                {requireCamera && (
                    <li>
                        <Camera size={20} />
                        <div>
                            <strong>Camera</strong>
                            <span>To verify your identity</span>
                        </div>
                    </li>
                )}
                {requireLocation && (
                    <li>
                        <MapPin size={20} />
                        <div>
                            <strong>Location</strong>
                            <span>To confirm you are on campus</span>
                        </div>
                    </li>
                )}
            </ul>

            <div className="consent-privacy-note">
                <p>Your data is encrypted and only used for attendance verification.</p>
            </div>

            <div className="consent-actions">
                {onDecline && (
                    <button
                        className="secondary-button"
                        onClick={onDecline}
                        disabled={isLoading}
                    >
                        Decline
                    </button>
                )}
                <button
                    className="primary-button"
                    onClick={onAccept}
                    disabled={isLoading}
                >
                    {isLoading ? 'Requesting...' : 'Allow Access'}
                </button>
            </div>
        </div>
    );
}
