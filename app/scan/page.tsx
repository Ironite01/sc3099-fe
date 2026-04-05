'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FlipHorizontal, X, QrCode } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import jsQR from 'jsqr';
import { getActiveSessions } from '@/lib/api';

type ScanStatus = 'scanning' | 'found' | 'error' | 'invalid';
type FacingMode = 'environment' | 'user';

export default function ScanPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const isMountedRef = useRef(true);
    const isNavigatingRef = useRef(false);

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
                    sessionsLoadedRef.current = true;
                }
            })
            .catch(() => { /* graceful degradation — all QRs allowed through */ });
    }, []);

    /** Extract session ID from whatever format the QR contains */
    const parseQRContent = (content: string): { sessionId: string; raw: string } | null => {
        try {
            const url = new URL(content);
            const id = url.searchParams.get('sessionId');
            if (id) return { sessionId: id, raw: content };
        } catch {
            try {
                const obj = JSON.parse(content);
                if (obj.sessionId) return { sessionId: String(obj.sessionId), raw: content };
            } catch { /* fall through */ }
        }
        const trimmed = content.trim();
        return trimmed.length > 0 ? { sessionId: trimmed, raw: content } : null;
    };

    const stopCamera = useCallback(() => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        const stream = streamRef.current;
        if (stream) {
            stream.getTracks().forEach((track) => {
                track.enabled = false;
                track.stop();
            });
        }
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
        }
        streamRef.current = null;
    }, []);

    const navigateToDashboard = useCallback(async () => {
        if (isNavigatingRef.current) return;
        isNavigatingRef.current = true;
        stopCamera();
        // Give the browser one short frame to release camera hardware before route transition.
        await new Promise((resolve) => setTimeout(resolve, 80));
        window.location.assign('/dashboard');
    }, [stopCamera]);

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
            const parsed = parseQRContent(code.data);
            if (parsed) {
                setStatus('found');
                setStatusText('QR code detected!');
                stopCamera();
                setTimeout(() => {
                    router.push(`/attendance?sessionId=${encodeURIComponent(parsed.sessionId)}&qr=${encodeURIComponent(parsed.raw)}`);
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
                if (!isMountedRef.current) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
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
        isMountedRef.current = true;
        startCamera(facingMode);

        const stopOnPageHide = () => stopCamera();
        const stopOnVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                stopCamera();
            }
        };

        window.addEventListener('pagehide', stopOnPageHide);
        window.addEventListener('beforeunload', stopOnPageHide);
        document.addEventListener('visibilitychange', stopOnVisibilityChange);
        window.addEventListener('popstate', stopOnPageHide);

        return () => {
            isMountedRef.current = false;
            window.removeEventListener('pagehide', stopOnPageHide);
            window.removeEventListener('beforeunload', stopOnPageHide);
            document.removeEventListener('visibilitychange', stopOnVisibilityChange);
            window.removeEventListener('popstate', stopOnPageHide);
            stopCamera();
        };
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
                onBack={navigateToDashboard}
                rightAction={
                    <button
                        className="icon-button"
                        onClick={navigateToDashboard}
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

            </div>

            {/* Hidden canvas for jsQR processing */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </main>
    );
}
