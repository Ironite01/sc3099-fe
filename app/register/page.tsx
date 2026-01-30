'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ShieldCheck, Image, CheckCircle, AlertCircle } from 'lucide-react';
import AuthCard, { AuthField } from '@/components/AuthCard';
import Card from '@/components/Card';
import { register, login, enrollFace } from '@/lib/api';
import { validateEmail, validatePassword, validateFullName } from '@/lib/validation';

type RegistrationStep = 'register' | 'consent' | 'camera' | 'preview' | 'submitting' | 'success' | 'error';

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

    const fields: AuthField[] = [
        {
            name: 'fullName',
            type: 'text',
            label: 'Full Name',
            placeholder: 'Enter your full name',
            icon: <User size={20} />,
            autoComplete: 'name',
            validate: validateFullName,
        },
        {
            name: 'email',
            type: 'email',
            label: 'Email',
            placeholder: 'Enter your email',
            icon: <Mail size={20} />,
            autoComplete: 'email',
            validate: validateEmail,
        },
        {
            name: 'password',
            type: 'password',
            label: 'Password',
            placeholder: 'Create a password',
            icon: <Lock size={20} />,
            autoComplete: 'new-password',
            validate: validatePassword,
        },
        {
            name: 'confirmPassword',
            type: 'password',
            label: 'Confirm Password',
            placeholder: 'Confirm your password',
            icon: <Lock size={20} />,
            autoComplete: 'new-password',
            validate: (value, formValues) => {
                if (value !== formValues.password) {
                    return 'Passwords do not match';
                }
                return true;
            },
        },
    ];

    const handleRegisterContinue = async (values: Record<string, string>) => {
        setUserData({ fullName: values.fullName.trim(), email: values.email.trim(), password: values.password });
        setStep('consent');
        return { success: true };
    };

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

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        setStep('preview');
        stopCamera();
    }, [stopCamera]);

    const retakePhoto = useCallback(() => {
        setCapturedImage(null);
        setError('');
        startCamera();
    }, [startCamera]);

    const submitPhoto = async () => {
        if (!capturedImage || !userData) return;

        setStep('submitting');
        setError('');

        const base64Image = capturedImage.replace(/^data:image\/\w+;base64,/, '');

        const registerResult = await register(userData.email, userData.password, userData.fullName);

        if (!registerResult.success) {
            setError(registerResult.error || 'Registration failed');
            setStep('error');
            return;
        }

        const enrollResult = await enrollFace(base64Image);

        if (enrollResult.success && enrollResult.data) {
            setQualityScore(enrollResult.data.quality_score);

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

    const acceptConsent = () => {
        startCamera();
    };

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const goToHome = () => {
        router.push('/');
    };

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
            />
        );
    }

    const goBack = () => {
        stopCamera();
        setCapturedImage(null);
        setError('');
        setStep('register');
    };

    const showBackLink = ['consent', 'camera', 'preview'].includes(step);
    const enrollFooter = showBackLink ? (
        <p className="auth-link">
            <a href="#" onClick={(e) => { e.preventDefault(); goBack(); }}>
                ← Go back to registration
            </a>
        </p>
    ) : null;

    return (
        <Card
            title="Face Enrollment"
            subtitle="Verify your identity for secure check-ins"
            icon={<ShieldCheck size={48} />}
            footerContent={enrollFooter}
        >
            {step === 'consent' && (
                <div className="enroll-content">
                    <div className="consent-info">
                        <Image size={48} className="consent-icon" />
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

            {step === 'submitting' && (
                <div className="enroll-content">
                    <div className="loading-container">
                        <div className="spinner large"></div>
                        <p>Completing registration...</p>
                    </div>
                </div>
            )}

            {step === 'success' && (
                <div className="enroll-content">
                    <div className="success-container">
                        <div className="success-icon">
                            <CheckCircle size={48} />
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

            {step === 'error' && (
                <div className="enroll-content">
                    <div className="error-container">
                        <div className="error-icon">
                            <AlertCircle size={48} />
                        </div>
                        <h2>Something Went Wrong</h2>
                        <p className="error-message">{error}</p>
                    </div>
                    <button className="primary-button" onClick={retakePhoto}>
                        Try Again
                    </button>
                </div>
            )}

            {error && step === 'consent' && (
                <div className="error-banner" role="alert">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </Card>
    );
}
