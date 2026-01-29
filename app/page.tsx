'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    getCurrentUser,
    getActiveSessions,
    submitCheckIn,
    getCheckInHistory,
    updateConsent,
} from '@/lib/api';
import { getCurrentPosition } from '@/lib/geolocation';
import { getOrGenerateDeviceKey, getOrGenerateFingerprint } from '@/lib/device';
import { captureFrame } from '@/lib/camera';
import SessionCard from '@/components/SessionCard';
import ConsentDialog from '@/components/ConsentDialog';

type CheckInStep = 'idle' | 'camera-consent' | 'camera' | 'location-consent' | 'location' | 'submitting' | 'success' | 'error';

interface Session {
    id: string;
    course_name: string;
    session_type: string;
    start_time: string;
    end_time: string;
    location_lat: number;
    location_lon: number;
    location_radius_m: number;
    allow_late_checkin: boolean;
    late_checkin_minutes: number;
}

interface CheckInHistory {
    id: string;
    session_id: string;
    course_name: string;
    session_type: string;
    check_in_time: string;
    risk_score: number;
    status: string;
    face_match_confidence: number;
    liveness_score: number;
    location_verified: boolean;
    device_trusted: boolean;
}

export default function Home() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [history, setHistory] = useState<CheckInHistory[]>([]);
    const [error, setError] = useState('');

    // Check-in flow state
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [checkInStep, setCheckInStep] = useState<CheckInStep>('idle');
    const [capturedImage, setCapturedImage] = useState<string>('');
    const [checkInResult, setCheckInResult] = useState<any>(null);
    const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

    // Load user and sessions
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        setError('');

        // Check authentication
        const userResult = await getCurrentUser();
        if (!userResult.success) {
            router.push('/login');
            return;
        }

        setUser(userResult.data);

        // Load active sessions
        const sessionsResult = await getActiveSessions();
        if (sessionsResult.success && sessionsResult.data) {
            setSessions(sessionsResult.data);
        }

        // Load check-in history
        const historyResult = await getCheckInHistory(5);
        if (historyResult.success && historyResult.data) {
            setHistory(historyResult.data);
        }

        setIsLoading(false);
    };

    const handleCheckIn = (sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        setSelectedSession(session);
        setCheckInStep('camera-consent');
    };

    const handleCameraConsent = async () => {
        // Update consent in backend
        await updateConsent(true, undefined);
        setCheckInStep('camera');
        startCamera();
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            });
            setVideoStream(stream);
        } catch (err) {
            setError('Failed to access camera. Please grant permission.');
            setCheckInStep('error');
        }
    };

    const handleCapture = () => {
        const video = document.querySelector('video') as HTMLVideoElement;
        if (!video) return;

        try {
            const image = captureFrame(video, 0.9, true);
            setCapturedImage(image);
            stopCamera();
            setCheckInStep('location-consent');
        } catch (err) {
            setError('Failed to capture image.');
            setCheckInStep('error');
        }
    };

    const stopCamera = () => {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            setVideoStream(null);
        }
    };

    const handleLocationConsent = async () => {
        // Update consent in backend
        await updateConsent(undefined, true);
        setCheckInStep('location');
        submitCheckInRequest();
    };

    const submitCheckInRequest = async () => {
        if (!selectedSession || !capturedImage) return;

        setCheckInStep('submitting');
        setError('');

        try {
            // Get location
            const position = await getCurrentPosition();

            // Get device info
            const fingerprint = await getOrGenerateFingerprint();
            const publicKey = await getOrGenerateDeviceKey();

            // Submit check-in
            const result = await submitCheckIn({
                sessionId: selectedSession.id,
                imageBase64: capturedImage,
                latitude: position.latitude,
                longitude: position.longitude,
                deviceFingerprint: fingerprint,
                devicePublicKey: publicKey,
            });

            if (result.success && result.data) {
                setCheckInResult(result.data);
                setCheckInStep('success');
                // Reload data
                loadData();
            } else {
                setError(result.error || 'Check-in failed');
                setCheckInStep('error');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Check-in failed');
            setCheckInStep('error');
        }
    };

    const resetCheckIn = () => {
        setSelectedSession(null);
        setCheckInStep('idle');
        setCapturedImage('');
        setCheckInResult(null);
        setError('');
        stopCamera();
    };

    if (isLoading) {
        return (
            <main className="home-container">
                <div className="loading-screen">
                    <div className="spinner large"></div>
                    <p>Loading...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="home-container">
            {/* Header */}
            <header className="home-header">
                <div className="logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                </div>
                <h1>SAIV Attendance</h1>
                {user && <p className="user-welcome">Welcome, {user.full_name}</p>}
                <div className="header-actions">
                    <a href="/enroll" className="icon-button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="10" r="3" />
                            <path d="M12 13v9" />
                        </svg>
                    </a>
                    <a href="/sessions" className="icon-button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </a>
                </div>
            </header>

            {/* Active Sessions */}
            <section className="sessions-section">
                <h2 className="section-title">Active Sessions</h2>
                {sessions.length === 0 ? (
                    <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <p>No active sessions at the moment</p>
                    </div>
                ) : (
                    <div className="sessions-grid">
                        {sessions.map(session => (
                            <SessionCard
                                key={session.id}
                                session={session}
                                onCheckIn={handleCheckIn}
                                isCheckedIn={history.some(h => h.session_id === session.id)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Check-in History */}
            {history.length > 0 && (
                <section className="history-section">
                    <h2 className="section-title">Recent Check-ins</h2>
                    <div className="history-list">
                        {history.map(item => (
                            <div key={item.id} className="history-item">
                                <div className="history-info">
                                    <h4>{item.course_name}</h4>
                                    <p>{new Date(item.check_in_time).toLocaleString()}</p>
                                </div>
                                <div className="history-status">
                                    <span className={`risk-badge risk-${item.risk_score < 30 ? 'low' : item.risk_score < 70 ? 'medium' : 'high'}`}>
                                        Risk: {item.risk_score}%
                                    </span>
                                    <span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Check-in Flow Modals */}
            <ConsentDialog
                type="camera"
                isOpen={checkInStep === 'camera-consent'}
                onAccept={handleCameraConsent}
                onDecline={resetCheckIn}
            />

            <ConsentDialog
                type="geolocation"
                isOpen={checkInStep === 'location-consent'}
                onAccept={handleLocationConsent}
                onDecline={resetCheckIn}
            />

            {/* Camera Modal */}
            {checkInStep === 'camera' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Capture Your Face</h3>
                        <div className="camera-container">
                            <video autoPlay playsInline muted className="camera-video" />
                            <div className="face-overlay">
                                <div className="face-guide"></div>
                            </div>
                        </div>
                        <p className="camera-hint">Position your face within the oval</p>
                        <div className="button-group">
                            <button onClick={resetCheckIn} className="secondary-button">Cancel</button>
                            <button onClick={handleCapture} className="primary-button">Capture</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Submitting */}
            {checkInStep === 'submitting' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="loading-container">
                            <div className="spinner large"></div>
                            <p>Processing check-in...</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Success */}
            {checkInStep === 'success' && checkInResult && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="success-container">
                            <div className="success-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </div>
                            <h2>Check-in Successful!</h2>
                            <div className="result-details">
                                <div className="detail-item">
                                    <span>Risk Score:</span>
                                    <span className={`risk-badge risk-${checkInResult.risk_score < 30 ? 'low' : checkInResult.risk_score < 70 ? 'medium' : 'high'}`}>
                                        {checkInResult.risk_score}%
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span>Face Match:</span>
                                    <span>{Math.round(checkInResult.face_match_confidence * 100)}%</span>
                                </div>
                                <div className="detail-item">
                                    <span>Location:</span>
                                    <span>{checkInResult.location_verified ? '✓ Verified' : '✗ Not Verified'}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={resetCheckIn} className="primary-button">Done</button>
                    </div>
                </div>
            )}

            {/* Error */}
            {checkInStep === 'error' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="error-container">
                            <div className="error-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <h2>Check-in Failed</h2>
                            <p className="error-message">{error}</p>
                        </div>
                        <button onClick={resetCheckIn} className="primary-button">Try Again</button>
                    </div>
                </div>
            )}
        </main>
    );
}
