'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Camera, MapPin, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ConsentModal from '@/components/ConsentModal';
import LivenessChallengeComponent from '@/components/LivenessChallenge';
import StatusResult from '@/components/StatusResult';
import { useCamera } from '@/hooks/useCamera';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useLiveness } from '@/hooks/useLiveness';
import { getActiveSessions, getMyDevices, submitAttendance, registerDevice } from '@/lib/api';
import type { Session, GeolocationCoords, AttendanceResult } from '@/lib/types';
import fpPromise from '@fingerprintjs/fingerprintjs';

const DEVICE_BIND_ERROR_KEY = 'saiv_device_bind_error';

type AttendanceStep =
    | 'loading'
    | 'select-session'
    | 'consent'
    | 'liveness'
    | 'capture'
    | 'submitting'
    | 'success'
    | 'error';

type ConsentStep = 'intro' | 'location' | 'camera' | 'ready';

function AttendanceContent() {
    const searchParams = useSearchParams();
    const preselectedSessionId = searchParams.get('sessionId');
    const scannedQrCode = searchParams.get('qr');

    const [step, setStep] = useState<AttendanceStep>('loading');
    const [consentStep, setConsentStep] = useState<ConsentStep>('location');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [location, setLocation] = useState<GeolocationCoords | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [locationGranted, setLocationGranted] = useState(false);
    const [cameraGranted, setCameraGranted] = useState(false);
    const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
    const [checkinResult, setCheckinResult] = useState<AttendanceResult | null>(null);

    const camera = useCamera();
    const geo = useGeolocation();
    const liveness = useLiveness({
        challengeCount: 2,
        challengeDuration: 8000,
        // Auto-capture happens when isComplete becomes true
        onFail: () => {
            setError('Liveness verification timed out. Please try again.');
            setStep('error');
        },
    });

    useEffect(() => {
        async function init() {
            try {
                // Initialize fingerprint handling
                const fp = await fpPromise.load();
                const result = await fp.get();
                const visitorId = result.visitorId;
                setDeviceFingerprint(visitorId);

                // Auto-register (or refresh) this device in the backend so the
                // check-in handler can enforce device-binding per course settings.
                const deviceRegistration = await registerDevice({
                    device_fingerprint: visitorId,
                    device_name: navigator?.userAgent ?? 'Browser',
                    platform: 'web',
                });
                if (!deviceRegistration.success) {
                    const msg = deviceRegistration.error || 'Device registration failed.';
                    const isFingerprintConflict = /device fingerprint already registered/i.test(msg);
                    if (isFingerprintConflict) {
                        const devices = await getMyDevices();
                        if (devices.success && (devices.data?.length || 0) > 0) {
                            sessionStorage.removeItem(DEVICE_BIND_ERROR_KEY);
                        } else {
                            sessionStorage.setItem(DEVICE_BIND_ERROR_KEY, msg);
                            setError(
                                `${msg} Please unbind the old account from this device in My Devices, or use another browser/device before check-in.`
                            );
                            setStep('error');
                            return;
                        }
                    } else {
                        sessionStorage.setItem(DEVICE_BIND_ERROR_KEY, msg);
                        setError(
                            `${msg} Please unbind the old account from this device in My Devices, or use another browser/device before check-in.`
                        );
                        setStep('error');
                        return;
                    }
                }
                sessionStorage.removeItem(DEVICE_BIND_ERROR_KEY);

                const sessionResult = await getActiveSessions();

                if (sessionResult.success && sessionResult.data) {
                    setSessions(sessionResult.data);

                    if (preselectedSessionId) {
                        const session = sessionResult.data.find(s => s.id === preselectedSessionId);
                        if (session) {
                            setSelectedSession(session);
                            setStep('consent');
                            return;
                        }
                    }

                    setStep('select-session');
                } else {
                    setError(sessionResult.error || 'Failed to load active sessions');
                    setStep('error');
                }
            } catch (err) {
                console.error("Initialization error:", err);
                setError('Failed to initialize connection or load sessions.');
                setStep('error');
            }
        }

        init();
    }, [preselectedSessionId]);

    const handleSessionSelect = (session: Session) => {
        setSelectedSession(session);
        setStep('consent');
    };

    const handleRequestLocation = useCallback(async () => {
        const locationResult = await geo.requestLocation();

        if (locationResult) {
            setLocation(locationResult);
            setLocationGranted(true);
            setConsentStep('camera');
        } else {
            setError(geo.error || 'Location access denied');
        }
    }, [geo]);

    const handleRequestCamera = useCallback(async () => {
        await camera.startCamera();

        if (camera.error) {
            setError(camera.error);
        } else {
            setCameraGranted(true);
            setConsentStep('ready');
        }
    }, [camera]);

    const handleConsentComplete = useCallback(() => {
        if (selectedSession?.require_liveness_check === false) {
            // Session does not require liveness — skip straight to capture
            handleCapture();
        } else {
            liveness.startChallenge();
            setStep('liveness');
        }
    }, [liveness, selectedSession]);

    // Handle auto-capture when liveness is complete
    useEffect(() => {
        if (liveness.isComplete && liveness.livenessToken && step === 'liveness') {
            // Wait for success animation
            const timer = setTimeout(() => {
                handleCapture();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [liveness.isComplete, liveness.livenessToken, step]);

    useEffect(() => {
        if ((step === 'liveness' || step === 'capture') && camera.isActive && camera.videoRef.current) {
            camera.videoRef.current.play().catch(console.error);
        }
    }, [step, camera.isActive, camera.videoRef]);

    const handleCapture = () => {
        // Capture logic
        const image = camera.capturePhoto();

        if (!image) {
            setError('Failed to capture photo');
            setStep('error');
            return;
        }

        setCapturedImage(image);
        camera.stopCamera();
        handleSubmit(image);
    };

    const handleSubmit = async (image: string) => {
        const livenessRequired = selectedSession?.require_liveness_check !== false;
        if (!selectedSession || !location || (livenessRequired && !liveness.livenessToken) || !deviceFingerprint) {
            setError('Missing required data for check-in');
            setStep('error');
            return;
        }

        setStep('submitting');

        const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

        const result = await submitAttendance({
            session_id: selectedSession.id,
            face_image: base64Image,
            location,
            liveness_token: liveness.livenessToken ?? '',
            device_fingerprint: deviceFingerprint,
            qr_code: scannedQrCode ?? undefined,
        });

        if (result.success && result.data) {
            setCheckinResult(result.data);
            setStep('success');
        } else {
            setError(result.error || 'Attendance submission failed');
            setStep('error');
        }
    };

    const handleRetry = () => {
        setError(null);
        setCapturedImage(null);
        liveness.reset();
        camera.stopCamera();
        setConsentStep('location');
        setLocationGranted(false);
        setCameraGranted(false);
        setStep('consent');
    };

    const getPageTitle = () => {
        switch (step) {
            case 'select-session': return 'Select Session';
            case 'consent': return 'Permissions';
            case 'liveness': return 'Liveness Check';
            case 'capture': return 'Face Capture';
            case 'submitting': return 'Verifying';
            case 'success': return 'Success';
            case 'error': return 'Error';
            default: return selectedSession?.course_code || 'Attendance';
        }
    };

    return (
        <main className="page-container">
            <div className="bg-orb bg-orb-1" />
            <div className="bg-orb bg-orb-2" />

            <PageHeader
                title={getPageTitle()}
                backHref="/dashboard"
            />

            <div className="page-content">
                {step === 'loading' && (
                    <div className="loading-state">
                        <div className="spinner large" />
                        <p>Loading...</p>
                    </div>
                )}

                {step === 'select-session' && (
                    <div className="course-select-container">
                        <h2>Select a Session</h2>
                        <p className="section-description">Choose the active session to check into</p>
                        <div className="courses-list">
                            {sessions.map(session => (
                                <button
                                    key={session.id}
                                    className="course-select-item"
                                    onClick={() => handleSessionSelect(session)}
                                >
                                    <span className="course-code">{session.course_code}</span>
                                    <span className="course-name">{session.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ConsentModal moved outside page-content, rendered below as a floating modal */}

                {step === 'liveness' && (
                    <div className="liveness-container">
                        <div className="camera-preview">
                            <video
                                ref={camera.videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="camera-video"
                            />
                            <div className="face-overlay">
                                <div className={`face-guide ${liveness.status === 'detecting' ? 'detecting' : ''} ${liveness.isComplete ? 'success' : ''}`}>
                                    {/* SVG Progress Ring — path starts at top (12 o'clock) going clockwise */}
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 240 320">
                                        <path
                                            d="M 120 2 A 118 158 0 0 1 120 318 A 118 158 0 0 1 120 2"
                                            fill="none"
                                            stroke={liveness.isComplete ? "var(--color-success)" : "var(--color-primary)"}
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeDasharray="875 9999"
                                            strokeDashoffset={875 - (875 * liveness.detectionProgress) / 100}
                                            className="scan-ring-circle"
                                            style={{ opacity: liveness.detectionProgress > 0 || liveness.isComplete ? 1 : 0 }}
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {liveness.isComplete ? (
                            <div className="liveness-challenge" style={{ borderColor: 'var(--color-success)' }}>
                                <div className="liveness-instruction-wrapper">
                                    <span className="liveness-icon">
                                        <Check size={20} color="var(--color-success)" />
                                    </span>
                                    <span className="liveness-instruction" style={{ color: 'var(--color-success)' }}>
                                        Verified
                                    </span>
                                </div>
                            </div>
                        ) : liveness.currentChallenge ? (
                            <LivenessChallengeComponent
                                challenge={liveness.currentChallenge}
                                timeRemaining={liveness.timeRemaining}
                                challengeIndex={liveness.challengeIndex}
                                totalChallenges={liveness.totalChallenges}
                                onActionDetected={liveness.completeCurrentChallenge}
                            />
                        ) : null}
                    </div>
                )}

                {step === 'submitting' && (
                    <div className="loading-state">
                        <div className="spinner large" />
                        <p>Verifying your attendance...</p>
                        <p className="loading-subtext">Checking face match and location</p>
                    </div>
                )}

                {step === 'success' && (
                    <StatusResult
                        success={checkinResult?.status !== 'rejected'}
                        title={
                            checkinResult?.status === 'flagged' ? 'Attendance Submitted' :
                            checkinResult?.status === 'rejected' ? 'Check-in Rejected' :
                            checkinResult?.status === 'pending' ? 'Attendance Pending' :
                            'Attendance Recorded!'
                        }
                        message={
                            checkinResult?.status === 'flagged'
                                ? 'Your check-in was recorded but flagged for manual review by your instructor.'
                                : checkinResult?.status === 'rejected'
                                ? 'Your check-in was rejected. Please contact your instructor.'
                                : checkinResult?.status === 'pending'
                                ? 'Your check-in has been submitted and is pending approval.'
                                : 'Your attendance has been successfully verified and recorded.'
                        }
                        details={
                            checkinResult?.distance_from_venue_meters != null
                                ? `${selectedSession?.course_code} · ${Math.round(checkinResult.distance_from_venue_meters)}m from venue`
                                : `${selectedSession?.course_code} - ${selectedSession?.name}`
                        }
                        homeHref="/dashboard"
                    />
                )}

                {step === 'error' && (
                    <StatusResult
                        success={false}
                        title="Verification Failed"
                        message={error || 'Something went wrong'}
                        onRetry={handleRetry}
                        homeHref="/dashboard"
                    />
                )}
            </div>

            <ConsentModal
                isOpen={step === 'consent'}
                step={consentStep}
                onRequestLocation={handleRequestLocation}
                onRequestCamera={handleRequestCamera}
                onComplete={handleConsentComplete}
                onDecline={() => window.history.back()}
                locationGranted={locationGranted}
                cameraGranted={cameraGranted}
                isLoading={geo.isLoading}
                error={error}
            />

            <canvas ref={camera.canvasRef} style={{ display: 'none' }} />
        </main>
    );
}

export default function AttendancePage() {
    return (
        <Suspense fallback={
            <main className="page-container">
                <div className="loading-state">
                    <div className="spinner large" />
                    <p>Loading...</p>
                </div>
            </main>
        }>
            <AttendanceContent />
        </Suspense>
    );
}
