'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthCard, { AuthField } from '@/components/AuthCard';
import Card from '@/components/Card';
import { register, login, enrollFace } from '@/lib/api';

type RegistrationStep = 'register' | 'consent' | 'camera' | 'preview' | 'submitting' | 'success' | 'error';

// Email validation helper
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Password validation helper
const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
        return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least 1 uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least 1 number';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return 'Password must contain at least 1 special character';
    }
    return null;
};

// SVG Icons
const EmailIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);

const LockIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const UserIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

export default function RegisterPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [step, setStep] = useState<RegistrationStep>('register');
    const [userData, setUserData] = useState<{ fullName: string; email: string; password: string } | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const [qualityScore, setQualityScore] = useState<number | null>(null);

    // Registration form fields
    const fields: AuthField[] = [
        {
            name: 'fullName',
            type: 'text',
            label: 'Full Name',
            placeholder: 'Enter your full name',
            icon: UserIcon,
            autoComplete: 'name',
        },
        {
            name: 'email',
            type: 'email',
            label: 'Email',
            placeholder: 'Enter your email',
            icon: EmailIcon,
            autoComplete: 'email',
            validate: (value) => {
                if (!isValidEmail(value)) {
                    return 'Please enter a valid email address';
                }
                return null;
            },
        },
        {
            name: 'password',
            type: 'password',
            label: 'Password',
            placeholder: 'Create a password',
            icon: LockIcon,
            autoComplete: 'new-password',
            validate: (value) => validatePassword(value),
        },
        {
            name: 'confirmPassword',
            type: 'password',
            label: 'Confirm Password',
            placeholder: 'Confirm your password',
            icon: LockIcon,
            autoComplete: 'new-password',
            validate: (value, allValues) => {
                if (value !== allValues.password) {
                    return 'Passwords do not match';
                }
                return null;
            },
        },
    ];

    // Handle registration form continue - just store data locally, don't send to backend yet
    const handleRegisterContinue = async (values: Record<string, string>) => {
        // Store user data for later submission with face photo
        setUserData({ fullName: values.fullName, email: values.email, password: values.password });
        // Move to face enrollment
        setStep('consent');
        return { success: true };
    };

    // Start camera stream
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                },
            });

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
        // Also clear the video element
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
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

    // Submit registration data + face photo together, then auto-login
    const submitPhoto = async () => {
        if (!capturedImage || !userData) return;

        setStep('submitting');
        setError('');

        // Remove data URL prefix to get pure base64
        const base64Image = capturedImage.replace(/^data:image\/\w+;base64,/, '');

        // Step 1: Register the user
        const registerResult = await register(userData.email, userData.password, userData.fullName);

        if (!registerResult.success) {
            setError(registerResult.error || 'Registration failed');
            setStep('error');
            return;
        }

        // Step 2: Enroll face
        const enrollResult = await enrollFace(base64Image);

        if (enrollResult.success && enrollResult.data) {
            setQualityScore(enrollResult.data.quality_score);

            // Step 3: Auto-login after successful registration and face enrollment
            const loginResult = await login(userData.email, userData.password);

            if (loginResult.success) {
                setStep('success');
            } else {
                setError(loginResult.error || 'Login failed after registration');
                setStep('error');
            }
        } else {
            setError(enrollResult.error || 'Face enrollment failed');
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

    // Registration step - show AuthCard
    if (step === 'register') {
        return (
            <AuthCard
                title="SAIV"
                subtitle="Create Your Account"
                fields={fields}
                submitLabel="Continue"
                onSubmit={handleRegisterContinue}
                footerLink={{
                    text: "Already have an account?",
                    linkText: "Sign In",
                    href: "/login",
                }}
                footerNote="Student Check-in System"
            />
        );
    }

    // Go back to registration form
    const goBack = () => {
        stopCamera();
        setCapturedImage(null);
        setError('');
        setStep('register');
    };

    // Face enrollment icon
    const FaceIcon = (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <circle cx="12" cy="10" r="3" />
            <path d="M12 13v2" />
        </svg>
    );

    // Footer with go back link (show during consent, camera, and preview steps)
    const showBackLink = ['consent', 'camera', 'preview'].includes(step);
    const enrollFooter = showBackLink ? (
        <p className="auth-link">
            <a href="#" onClick={(e) => { e.preventDefault(); goBack(); }}>
                ← Go back to registration
            </a>
        </p>
    ) : null;

    // Face enrollment steps
    return (
        <Card
            title="Face Enrollment"
            subtitle="Verify your identity for secure check-ins"
            icon={FaceIcon}
            footerContent={enrollFooter}
        >
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
                        <p>Completing registration...</p>
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
                        <h2>Registration Complete!</h2>
                        {qualityScore !== null && (
                            <p className="quality-score">
                                Face Quality: {Math.round(qualityScore * 100)}%
                            </p>
                        )}
                        <p>You&apos;re now logged in and ready to use SAIV.</p>
                    </div>
                    <button className="primary-button" onClick={goToHome}>
                        Go to Dashboard
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
                        <h2>Something Went Wrong</h2>
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
        </Card>
    );
}
