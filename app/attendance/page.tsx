'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Camera, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ConsentModal from '@/components/ConsentModal';
import LivenessChallengeComponent from '@/components/LivenessChallenge';
import StatusResult from '@/components/StatusResult';
import { useCamera } from '@/hooks/useCamera';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useLiveness } from '@/hooks/useLiveness';
import { getActiveSessions, getCheckinChallenge, getMyDevices, getMySessions, getSessionById, submitAttendance, registerDevice, updateConsent } from '@/lib/api';
import type { Session, GeolocationCoords, AttendanceResult } from '@/lib/types';
import fpPromise from '@fingerprintjs/fingerprintjs';

const DEVICE_BIND_ERROR_KEY = 'saiv_device_bind_error';

type AttendanceStep =
    | 'loading'
    | 'select-session'
    | 'consent'
    | 'baseline'
    | 'liveness'
    | 'submitting'
    | 'success'
    | 'error';

type ConsentStep = 'intro' | 'location' | 'camera' | 'ready';

function mapChallengeTypeToBackend(type?: 'blink' | 'turn_left' | 'turn_right' | 'smile' | 'look_up' | 'look_down') {
    switch (type) {
        case 'blink':
            return 'blink' as const;
        case 'turn_left':
            return 'head_left' as const;
        case 'turn_right':
            return 'head_right' as const;
        case 'look_up':
            return 'head_up' as const;
        case 'look_down':
            return 'head_down' as const;
        case 'smile':
        default:
            return 'passive' as const;
    }
}

function mapBackendChallengeToFrontend(type?: string): 'blink' | 'turn_left' | 'turn_right' | 'smile' | 'look_up' | 'look_down' {
    switch (type) {
        case 'blink':
            return 'blink';
        case 'head_left':
            return 'turn_left';
        case 'head_right':
            return 'turn_right';
        case 'head_up':
            return 'look_up';
        case 'head_down':
            return 'look_down';
        default:
            return 'smile';
    }
}

function AttendanceContent() {
    const searchParams = useSearchParams();
    const preselectedSessionId = searchParams.get('sessionId');
    const scannedQrCode = searchParams.get('qr');

    const [step, setStep] = useState<AttendanceStep>('loading');
    const [consentStep, setConsentStep] = useState<ConsentStep>('location');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [location, setLocation] = useState<GeolocationCoords | null>(null);
    const [livenessImage, setLivenessImage] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [issuedChallenge, setIssuedChallenge] = useState<{ token: string; type: string; instruction: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [locationGranted, setLocationGranted] = useState(false);
    const [cameraGranted, setCameraGranted] = useState(false);
    const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
    const [checkinResult, setCheckinResult] = useState<AttendanceResult | null>(null);
    const [baselineAutoCaptureStarted, setBaselineAutoCaptureStarted] = useState(false);

    const camera = useCamera();
    const geo = useGeolocation();
    const liveness = useLiveness({
        challengeCount: 2,
        challengeDuration: 8000,
        onFail: () => {
            setError('Liveness verification timed out. Please try again.');
            setStep('error');
        },
    });

    useEffect(() => {
        async function init() {
            try {
                const fp = await fpPromise.load();
                const result = await fp.get();
                const visitorId = result.visitorId;
                setDeviceFingerprint(visitorId);

                const deviceRegistration = await registerDevice({
                    device_fingerprint: visitorId,
                    device_name: navigator?.userAgent ?? 'Browser',
                    platform: 'web',
                });
                if (!deviceRegistration.success) {
                    const msg = deviceRegistration.error || 'Device registration failed.';
                    const devices = await getMyDevices();
                    const hasBoundDevice = devices.success && (devices.data?.length || 0) > 0;
                    const isFingerprintConflict = /device fingerprint already registered/i.test(msg);

                    if (hasBoundDevice) {
                        sessionStorage.removeItem(DEVICE_BIND_ERROR_KEY);
                    } else {
                        sessionStorage.setItem(DEVICE_BIND_ERROR_KEY, msg);
                        setError(
                            isFingerprintConflict
                                ? `${msg} Please unbind the old account from this device in My Devices, or use another browser/device before check-in.`
                                : `${msg} Please bind a device in My Devices, then try again.`
                        );
                        setStep('error');
                        return;
                    }
                }
                sessionStorage.removeItem(DEVICE_BIND_ERROR_KEY);

                const [sessionResult, activeResult] = await Promise.all([
                    getMySessions('active'),
                    getActiveSessions(),
                ]);

                if (sessionResult.success && sessionResult.data) {
                    const myActiveSessions = sessionResult.data;
                    setSessions(myActiveSessions);

                    if (preselectedSessionId) {
                        // Preserve QR flow behavior using the public active list.
                        let session = (activeResult.success && activeResult.data
                            ? activeResult.data
                            : myActiveSessions
                        ).find(s => s.id === preselectedSessionId);

                        // If not found in the limited general load, retrieve it directly!
                        if (!session) {
                            const specificRes = await getSessionById(preselectedSessionId);
                            if (specificRes.success && specificRes.data) {
                                session = specificRes.data;
                            }
                        }

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
                console.error('Initialization error:', err);
                setError('Failed to initialize connection or load sessions.');
                setStep('error');
            }
        }

        init();
    }, [preselectedSessionId]);

    const handleSessionSelect = (session: Session) => {
        setSelectedSession(session);
        setIssuedChallenge(null);
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

    const handleConsentComplete = useCallback(async () => {
        const session = selectedSession;
        if (!session) {
            setError('No session selected');
            setStep('error');
            return;
        }

        const consentResult = await updateConsent(
            cameraGranted ? true : undefined,
            locationGranted ? true : undefined
        );
        if (!consentResult.success) {
            setError(consentResult.error || 'Unable to save consent settings.');
            setStep('error');
            return;
        }

        // Always enforce baseline front-facing capture first.
        setStep('baseline');
    }, [selectedSession, cameraGranted, locationGranted]);

    useEffect(() => {
        if (liveness.isComplete && liveness.livenessToken && step === 'liveness') {
            const livenessFrame = livenessImage || camera.capturePhoto();
            if (!livenessFrame) {
                setError('Failed to capture liveness image');
                setStep('error');
                return;
            }
            setLivenessImage(livenessFrame);

            const timer = setTimeout(() => {
                if (!capturedImage) {
                    setError('Missing front-facing verification photo');
                    setStep('error');
                    return;
                }
                camera.stopCamera();
                handleSubmit(capturedImage, livenessFrame, true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [liveness.isComplete, liveness.livenessToken, step, camera, capturedImage, livenessImage]);

    // Capture liveness frame as soon as challenge turns success, while the user
    // is still holding the required pose.
    useEffect(() => {
        if (step !== 'liveness') return;
        if (liveness.status !== 'success') return;
        if (livenessImage) return;

        const frame = camera.capturePhoto();
        if (frame) {
            setLivenessImage(frame);
        }
    }, [step, liveness.status, livenessImage, camera]);

    useEffect(() => {
        if ((step === 'baseline' || step === 'liveness') && camera.isActive && camera.videoRef.current) {
            camera.videoRef.current.play().catch(console.error);
        }
    }, [step, camera.isActive, camera.videoRef]);

    useEffect(() => {
        if (step !== 'baseline' || !camera.isActive) return;
        if (baselineAutoCaptureStarted) return;

        const timer = setTimeout(() => {
            setBaselineAutoCaptureStarted(true);
            void handleBaselineCapture();
        }, 1600);

        return () => clearTimeout(timer);
    }, [step, camera.isActive, baselineAutoCaptureStarted]);

    const handleBaselineCapture = async () => {
        const image = camera.capturePhoto();

        if (!image) {
            setError('Failed to capture photo');
            setStep('error');
            return;
        }

        setCapturedImage(image);

        const session = selectedSession;
        if (!session) {
            setError('No session selected');
            setStep('error');
            return;
        }

        let hydratedSession = session;
        if (typeof hydratedSession.require_liveness_check !== 'boolean') {
            const detailResult = await getSessionById(session.id);
            if (detailResult.success && detailResult.data) {
                hydratedSession = {
                    ...session,
                    require_liveness_check: detailResult.data.require_liveness_check,
                    require_face_match: detailResult.data.require_face_match,
                };
                setSelectedSession(hydratedSession);
            }
        }

        const livenessRequired = hydratedSession.require_liveness_check === true;
        if (!livenessRequired) {
            camera.stopCamera();
            handleSubmit(image, undefined, false);
            return;
        }

        const challengeResult = await getCheckinChallenge(session.id);
        if (!challengeResult.success || !challengeResult.data) {
            setError(challengeResult.error || 'Unable to start liveness challenge');
            setStep('error');
            return;
        }
        setIssuedChallenge({
            token: challengeResult.data.challenge_token,
            type: challengeResult.data.challenge_type,
            instruction: challengeResult.data.instruction,
        });
        liveness.startChallenge([mapBackendChallengeToFrontend(challengeResult.data.challenge_type)]);
        setStep('liveness');
    };

    const handleSubmit = async (image: string, explicitLivenessImage?: string, forceLivenessRequired?: boolean) => {
        const livenessRequired = forceLivenessRequired ?? (selectedSession?.require_liveness_check === true);
        if (!selectedSession || !location || (livenessRequired && !liveness.livenessToken) || !deviceFingerprint) {
            setError('Missing required data for check-in');
            setStep('error');
            return;
        }

        setStep('submitting');

        const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
        const finalLivenessImage = explicitLivenessImage || livenessImage;
        const base64LivenessImage = finalLivenessImage
            ? finalLivenessImage.replace(/^data:image\/\w+;base64,/, '')
            : undefined;

        const result = await submitAttendance({
            session_id: selectedSession.id,
            face_image: base64Image,
            liveness_image: livenessRequired ? base64LivenessImage : undefined,
            location,
            liveness_token: livenessRequired ? (liveness.livenessToken ?? '') : '',
            liveness_challenge_type: livenessRequired
                ? ((issuedChallenge?.type as any) || mapChallengeTypeToBackend(liveness.currentChallenge?.type))
                : 'passive',
            liveness_challenge_token: livenessRequired ? issuedChallenge?.token : undefined,
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
        setIssuedChallenge(null);
        setLivenessImage(null);
        setCapturedImage(null);
        setBaselineAutoCaptureStarted(false);
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
            case 'baseline': return 'Face Verification';
            case 'liveness': return 'Liveness Check';
            case 'submitting': return 'Verifying';
            case 'success': return 'Success';
            case 'error': return 'Error';
            default: return selectedSession?.course_code || 'Attendance';
        }
    };
    const ringProgress = Math.max(0, Math.min(100, liveness.detectionProgress));

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
                        <p className="section-description">Choose an active session from your enrolled courses</p>
                        <div className="courses-list">
                            {sessions.length === 0 && (
                                <div className="dashboard-empty">
                                    <p>No active sessions available for your enrolled courses right now.</p>
                                </div>
                            )}
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

                {step === 'baseline' && (
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
                                <div className="face-guide detecting" />
                            </div>
                        </div>
                        <div className="liveness-challenge">
                            <div className="liveness-instruction-wrapper">
                                <span className="liveness-icon">
                                    <Camera size={20} color="var(--color-primary)" />
                                </span>
                                <span className="liveness-instruction">
                                    Look straight and center your face. Capturing verification photo automatically...
                                </span>
                            </div>
                        </div>
                    </div>
                )}

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
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 240 320">
                                        <path
                                            d="M 120 2 A 118 158 0 0 1 120 318 A 118 158 0 0 1 120 2"
                                            fill="none"
                                            stroke={liveness.isComplete ? 'var(--color-success)' : 'var(--color-primary)'}
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            pathLength={100}
                                            strokeDasharray={`${ringProgress} 100`}
                                            strokeDashoffset={0}
                                            className="scan-ring-circle"
                                            style={{ opacity: liveness.status === 'detecting' || liveness.isComplete ? 1 : 0 }}
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
