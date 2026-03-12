'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FlipHorizontal, X, QrCode } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import jsQR from 'jsqr';
import { USE_MOCK_DATA, MOCK_ACTIVE_SESSIONS } from '@/lib/mockData';
import { getActiveSessions } from '@/lib/api';

type ScanStatus = 'scanning' | 'found' | 'error' | 'invalid';
type FacingMode = 'environment' | 'user';

export default function ScanPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);

    const [status, setStatus] = useState<ScanStatus>('scanning');
    const [statusText, setStatusText] = useState('Point camera at QR code');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<FacingMode>('environment');
    const [canFlip, setCanFlip] = useState(false);

    /** Set of valid session IDs loaded from the server on mount */
    const validSessionIdsRef = useRef<Set<string>>(new Set());
    const sessionsLoadedRef = useRef(false);

    useEffect(() => {
        getActiveSessions()
            .then(res => {
                if (res.success && res.data) {
                    validSessionIdsRef.current = new Set(res.data.map(s => s.id));
                }
            })
            .catch(() => { /* graceful degradation — all QRs allowed through */ })
            .finally(() => { sessionsLoadedRef.current = true; });
    }, []);

    /** Extract session ID from whatever format the QR contains */
    const parseQRContent = (content: string): string | null => {
        try {
            const url = new URL(content);
            const id = url.searchParams.get('sessionId');
            if (id) return id;
        } catch {
            try {
                const obj = JSON.parse(content);
                if (obj.sessionId) return obj.sessionId;
            } catch { /* fall through */ }
        }
        const trimmed = content.trim();
        return trimmed.length > 0 ? trimmed : null;
    };

    const stopCamera = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    const scanFrame = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
            rafRef.current = requestAnimationFrame(scanFrame);
            return;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
        });

        if (code) {
            const sessionId = parseQRContent(code.data);
            if (sessionId) {
                // If sessions have loaded and this ID isn't in the list → invalid
                if (sessionsLoadedRef.current && !validSessionIdsRef.current.has(sessionId)) {
                    setStatus('invalid');
                    setStatusText('Invalid QR code — not a valid session');
                    // Resume scanning after 2.5 s
                    setTimeout(() => {
                        setStatus('scanning');
                        setStatusText('Point camera at QR code');
                        rafRef.current = requestAnimationFrame(scanFrame);
                    }, 2500);
                    return; // stop RAF loop; setTimeout will restart it
                }
                setStatus('found');
                setStatusText('QR code detected!');
                stopCamera();
                setTimeout(() => {
                    router.push(`/attendance?sessionId=${encodeURIComponent(sessionId)}`);
                }, 600);
                return;
            }
        }

        rafRef.current = requestAnimationFrame(scanFrame);
    }, [router, stopCamera]);

    const startCamera = useCallback(async (mode: FacingMode) => {
        stopCamera();
        setCameraError(null);

        // Check how many video devices exist — if >1, show flip button
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            setCanFlip(videoDevices.length > 1);
        } catch { /* ignore */ }

        // Try requested mode with `exact` first (forces rear on mobile).
        // On devices that only have one camera (e.g. laptop), `exact` throws —
        // we catch it and fall back to whatever camera is available.
        const constraints: MediaStreamConstraints[] = [
            { video: { facingMode: { exact: mode }, width: { ideal: 1280 }, height: { ideal: 720 } } },
            { video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } } },
            { video: true },
        ];

        for (const c of constraints) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia(c);
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                rafRef.current = requestAnimationFrame(scanFrame);
                return; // success
            } catch { /* try next constraint */ }
        }

        // All attempts failed
        setCameraError('Camera access denied. Please allow camera permissions and try again.');
        setStatus('error');
    }, [stopCamera, scanFrame]);

    useEffect(() => {
        startCamera(facingMode);
        return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facingMode]);

    const handleFlip = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    return (
        <main className="page-container" style={{ background: '#000' }}>
            <PageHeader
                title="Scan QR Code"
                backHref="/dashboard"
                rightAction={
                    <button
                        className="icon-button"
                        onClick={() => { stopCamera(); router.push('/dashboard'); }}
                        aria-label="Close scanner"
                    >
                        <X size={20} />
                    </button>
                }
            />

            <div className="qr-scanner-wrapper">
                {cameraError ? (
                    <div className="qr-error-state">
                        <QrCode size={48} />
                        <p>{cameraError}</p>
                        <button
                            className="primary-button"
                            style={{ marginTop: '1rem' }}
                            onClick={() => window.location.reload()}
                        >
                            Try Again
                        </button>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="qr-video"
                        />

                        {/* Viewfinder overlay */}
                        <div className="qr-overlay">
                            <div className={`qr-frame ${status === 'found' ? 'qr-frame-success' : ''}`}>
                                <span className="qr-corner qr-corner-tl" />
                                <span className="qr-corner qr-corner-tr" />
                                <span className="qr-corner qr-corner-bl" />
                                <span className="qr-corner qr-corner-br" />
                                {status === 'scanning' && <div className="qr-scan-line" />}
                            </div>
                        </div>

                        {/* Flip camera button — only shown when device has multiple cameras */}
                        {canFlip && (
                            <button
                                className="qr-flip-button"
                                onClick={handleFlip}
                                aria-label="Flip camera"
                            >
                                <FlipHorizontal size={22} />
                            </button>
                        )}

                        <div className={`qr-status-pill ${status === 'found' ? 'qr-status-found' : ''} ${status === 'invalid' ? 'qr-status-invalid' : ''}`}>
                            {statusText}
                        </div>
                    </>
                )}

                {/* Mock mode test shortcut — only visible in dev/mock mode */}
                {USE_MOCK_DATA && (
                    <div className="qr-mock-bar">
                        <span className="qr-mock-label">Test Mode</span>
                        {MOCK_ACTIVE_SESSIONS.map(s => (
                            <button
                                key={s.id}
                                className="qr-mock-btn"
                                onClick={() => {
                                    stopCamera();
                                    router.push(`/attendance?sessionId=${encodeURIComponent(s.id)}`);
                                }}
                            >
                                {s.course_code}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Hidden canvas for jsQR processing */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </main>
    );
}
