'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { enrollFace, updateConsent } from '@/lib/api';

type EnrollmentStep = 'consent' | 'camera' | 'preview' | 'submitting' | 'success' | 'error';

function EnrollPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const fromRegister = searchParams.get('fromRegister') === 'true';
    const enrollmentRequired = searchParams.get('required') === 'true';
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isMountedRef = useRef(true);

    const [step, setStep] = useState<EnrollmentStep>('consent');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const [qualityScore, setQualityScore] = useState<number | null>(null);

    // Start camera stream
    const startCamera = useCallback(async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('Camera access is not supported by this browser. Please ensure you are using HTTPS or a secure context.');
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                },
            });

            if (!isMountedRef.current) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            streamRef.current = stream;
            setStep('camera');
            setError('');
        } catch (err) {
            console.error('Camera error:', err);
            setError('Unable to access camera. Please grant permission and try again.');
        }
    }, []);

    useEffect(() => {
        if (step === 'camera' && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(err => {
                console.error('Video play error:', err);
            });
        }
    }, [step]);

    // Stop camera stream
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, []);

    // Capture photo from video
    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Mirror the image for selfie mode
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        setStep('preview');
        stopCamera();
    }, [stopCamera]);

    // Retake photo
    const retakePhoto = useCallback(() => {
        setCapturedImage(null);
        setError('');
        startCamera();
    }, [startCamera]);

    // Submit photo for enrollment
    const submitPhoto = async () => {
        if (!capturedImage) return;

        setStep('submitting');
        setError('');

        try {
            // Persist camera consent before face enrollment to satisfy backend policy checks.
            const consentResult = await updateConsent(true);
            if (!consentResult.success) {
                setError(consentResult.error || 'Unable to save camera consent.');
                setStep('error');
                return;
            }

            const base64Image = capturedImage.replace(/^data:image\/\w+;base64,/, '');
            const result = await enrollFace(base64Image);
            if (!result.success) {
                setError(result.error || 'Face enrollment failed. Please try again.');
                setStep('error');
                return;
            }

            setQualityScore(result.data?.quality_score ?? 0.95);
            setStep('success');
        } catch (err) {
            console.error('Face enrollment error:', err);
            setError('Face enrollment failed. Please try again.');
            setStep('error');
        }
    };

    // Handle consent acceptance
    const acceptConsent = () => {
        startCamera();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    // Go to home after success
    const goToHome = () => {
        router.push('/');
    };

    return (
        <main className="enroll-container">
            {/* Background */}
            <div className="bg-orb bg-orb-1"></div>
            <div className="bg-orb bg-orb-2"></div>

            <div className="enroll-card">
                {/* Header */}
                <div className="enroll-header">
                    {fromRegister && (
                        <div className="step-indicator">Step 2 of 2 — Account Setup</div>
                    )}
                    <div className="logo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <circle cx="12" cy="10" r="3" />
                            <path d="M12 13v2" />
                        </svg>
                    </div>
                    <h1>Face Enrollment</h1>
                    <p className="tagline">
                        {fromRegister
                            ? 'Last step — set up face recognition for attendance check-ins'
                            : 'Verify your identity for secure check-ins'}
                    </p>
                </div>

                {/* Consent Step */}
                {step === 'consent' && (
                    <div className="enroll-content">
                        <div className="consent-info">
                            <svg className="consent-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <path d="M21 15l-5-5L5 21" />
                            </svg>
                            <h2>Camera Permission Required</h2>
                            {enrollmentRequired && (
                                <p className="error-message" style={{ marginBottom: '0.75rem' }}>
                                    Face enrollment is required before you can continue.
                                </p>
                            )}
                            <p>
                                To enroll your face, we need access to your camera.
                                Your photo will be securely processed and only a
                                mathematical representation (not the actual image)
                                will be stored.
                            </p>
                            <ul className="consent-list">
                                <li>✓ Used only for identity verification</li>
                                <li>✓ Face image is not stored</li>
                                <li>✓ You can re-enroll anytime</li>
                            </ul>
                        </div>
                        <button className="primary-button" onClick={acceptConsent}>
                            Allow Camera Access
                        </button>
                    </div>
                )}

                {/* Camera Step */}
                {step === 'camera' && (
                    <div className="enroll-content">
                        <div className="camera-container">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="camera-video"
                            />
                            <div className="face-overlay">
                                <div className="face-guide"></div>
                            </div>
                        </div>
                        <p className="camera-hint">Position your face within the oval</p>
                        <button className="capture-button" onClick={capturePhoto}>
                            <span className="capture-icon"></span>
                        </button>
                    </div>
                )}

                {/* Preview Step */}
                {step === 'preview' && capturedImage && (
                    <div className="enroll-content">
                        <div className="preview-container">
                            <img src={capturedImage} alt="Captured face" className="preview-image" />
                        </div>
                        <p className="preview-hint">Does this photo look good?</p>
                        <div className="button-group">
                            <button className="secondary-button" onClick={retakePhoto}>
                                Retake
                            </button>
                            <button className="primary-button" onClick={submitPhoto}>
                                Submit
                            </button>
                        </div>
                    </div>
                )}

                {/* Submitting Step */}
                {step === 'submitting' && (
                    <div className="enroll-content">
                        <div className="loading-container">
                            <div className="spinner large"></div>
                            <p>Enrolling your face...</p>
                        </div>
                    </div>
                )}

                {/* Success Step */}
                {step === 'success' && (
                    <div className="enroll-content">
                        <div className="success-container">
                            <div className="success-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </div>
                            <h2>{fromRegister ? 'Account Setup Complete!' : 'Face Enrolled!'}</h2>
                            {qualityScore !== null && (
                                <p className="quality-score">
                                    Quality Score: {Math.round(qualityScore * 100)}%
                                </p>
                            )}
                            <p>
                                {fromRegister
                                    ? 'Your account is ready. You can now use face verification for attendance check-ins.'
                                    : 'You can now use face verification for check-ins.'}
                            </p>
                        </div>
                        <button className="primary-button" onClick={goToHome}>
                            Continue
                        </button>
                    </div>
                )}

                {/* Error Step */}
                {step === 'error' && (
                    <div className="enroll-content">
                        <div className="error-container">
                            <div className="error-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <h2>Enrollment Failed</h2>
                            <p className="error-message">{error}</p>
                        </div>
                        <button className="primary-button" onClick={retakePhoto}>
                            Try Again
                        </button>
                    </div>
                )}

                {/* General Error Display */}
                {error && step === 'consent' && (
                    <div className="error-banner" role="alert">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {/* Hidden canvas for photo capture */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
        </main>
    );
}

export default function EnrollPage() {
    return (
        <Suspense fallback={null}>
            <EnrollPageContent />
        </Suspense>
    );
}
