'use client';

import { Camera, MapPin, Shield, Check } from 'lucide-react';

type ConsentStep = 'intro' | 'location' | 'camera' | 'ready';

interface ConsentModalProps {
    step: ConsentStep;
    onRequestLocation: () => void;
    onRequestCamera: () => void;
    onComplete: () => void;
    onDecline?: () => void;
    locationGranted: boolean;
    cameraGranted: boolean;
    isLoading?: boolean;
    error?: string | null;
}

export default function ConsentModal({
    step,
    onRequestLocation,
    onRequestCamera,
    onComplete,
    onDecline,
    locationGranted,
    cameraGranted,
    isLoading = false,
    error,
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

            <div className="consent-steps">
                <div className={`consent-step ${locationGranted ? 'step-complete' : step === 'location' ? 'step-active' : ''}`}>
                    <div className="step-icon">
                        {locationGranted ? <Check size={20} /> : <MapPin size={20} />}
                    </div>
                    <div className="step-content">
                        <strong>Step 1: Location Access</strong>
                        <span>Confirm you are on campus</span>
                    </div>
                    {!locationGranted && step === 'location' && (
                        <button
                            className="step-action-button"
                            onClick={onRequestLocation}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Requesting...' : 'Allow'}
                        </button>
                    )}
                    {locationGranted && (
                        <span className="step-granted">Granted ✓</span>
                    )}
                </div>

                <div className={`consent-step ${cameraGranted ? 'step-complete' : step === 'camera' ? 'step-active' : ''}`}>
                    <div className="step-icon">
                        {cameraGranted ? <Check size={20} /> : <Camera size={20} />}
                    </div>
                    <div className="step-content">
                        <strong>Step 2: Camera Access</strong>
                        <span>Verify your identity</span>
                    </div>
                    {!cameraGranted && step === 'camera' && (
                        <button
                            className="step-action-button"
                            onClick={onRequestCamera}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Requesting...' : 'Allow'}
                        </button>
                    )}
                    {cameraGranted && (
                        <span className="step-granted">Granted ✓</span>
                    )}
                </div>
            </div>

            {error && (
                <div className="consent-error">
                    {error}
                </div>
            )}

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
                        Cancel
                    </button>
                )}
                {step === 'ready' && locationGranted && cameraGranted && (
                    <button
                        className="primary-button"
                        onClick={onComplete}
                    >
                        Continue to Verification
                    </button>
                )}
            </div>
        </div>
    );
}
