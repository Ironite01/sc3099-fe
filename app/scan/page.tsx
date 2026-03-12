'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Flashlight, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import jsQR from 'jsqr';

type ScanStatus = 'scanning' | 'found' | 'error';

export default function ScanPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);

    const [status, setStatus] = useState<ScanStatus>('scanning');
    const [statusText, setStatusText] = useState('Point camera at QR code');
    const [cameraError, setCameraError] = useState<string | null>(null);

    /** Extract session ID from whatever format the QR contains */
    const parseQRContent = (content: string): string | null => {
        try {
            // Format 1: plain session ID  e.g.  "session-1"
            // Format 2: URL  e.g.  "https://app.saiv.com/attendance?sessionId=session-1"
            // Format 3: JSON e.g.  '{"sessionId":"session-1"}'
            const url = new URL(content);
            const id = url.searchParams.get('sessionId');
            if (id) return id;
        } catch {
            // Not a URL — try JSON
            try {
                const obj = JSON.parse(content);
                if (obj.sessionId) return obj.sessionId;
            } catch {
                // Not JSON — treat entire string as session ID
            }
        }
        // Treat raw string as session ID (strip whitespace)
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
                setStatus('found');
                setStatusText('QR code detected!');
                stopCamera();
                // Brief pause so user sees the success state
                setTimeout(() => {
                    router.push(`/attendance?sessionId=${encodeURIComponent(sessionId)}`);
                }, 600);
                return;
            }
        }

        rafRef.current = requestAnimationFrame(scanFrame);
    }, [router, stopCamera]);

    useEffect(() => {
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment', // Use rear camera on mobile
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
                rafRef.current = requestAnimationFrame(scanFrame);
            } catch (err) {
                console.error('Camera error:', err);
                setCameraError('Camera access denied. Please allow camera permissions and try again.');
                setStatus('error');
            }
        }

        startCamera();
        return () => stopCamera();
    }, [scanFrame, stopCamera]);

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
                        <Flashlight size={48} />
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

                        <div className={`qr-status-pill ${status === 'found' ? 'qr-status-found' : ''}`}>
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
