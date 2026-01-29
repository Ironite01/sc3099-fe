'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { startCamera, stopCamera, captureFrame } from '@/lib/camera';

interface CameraProps {
    onCapture: (base64Image: string) => void;
    onError?: (error: string) => void;
    mirror?: boolean;
    quality?: number;
    autoStart?: boolean;
}

export default function Camera({
    onCapture,
    onError,
    mirror = true,
    quality = 0.9,
    autoStart = false,
}: CameraProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string>('');

    // Start camera stream
    const start = useCallback(async () => {
        try {
            const stream = await startCamera({
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 },
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setIsStreaming(true);
            setError('');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start camera';
            setError(errorMessage);
            if (onError) {
                onError(errorMessage);
            }
        }
    }, [onError]);

    // Stop camera stream
    const stop = useCallback(() => {
        if (streamRef.current) {
            stopCamera(streamRef.current);
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsStreaming(false);
    }, []);

    // Capture photo
    const capture = useCallback(() => {
        if (!videoRef.current || !isStreaming) {
            const errorMessage = 'Camera not ready';
            setError(errorMessage);
            if (onError) {
                onError(errorMessage);
            }
            return;
        }

        try {
            const base64Image = captureFrame(videoRef.current, quality, mirror);
            onCapture(base64Image);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to capture image';
            setError(errorMessage);
            if (onError) {
                onError(errorMessage);
            }
        }
    }, [isStreaming, quality, mirror, onCapture, onError]);

    // Auto-start camera if enabled
    useEffect(() => {
        if (autoStart) {
            start();
        }

        // Cleanup on unmount
        return () => {
            stop();
        };
    }, [autoStart, start, stop]);

    return (
        <div className="camera-component">
            <div className="camera-container">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-video"
                    style={{
                        transform: mirror ? 'scaleX(-1)' : 'none',
                    }}
                />
                {!isStreaming && !error && (
                    <div className="camera-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                        <p>Camera not started</p>
                    </div>
                )}
                {error && (
                    <div className="camera-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <p>{error}</p>
                    </div>
                )}
                {isStreaming && (
                    <div className="face-overlay">
                        <div className="face-guide"></div>
                    </div>
                )}
            </div>

            {isStreaming && (
                <p className="camera-hint">Position your face within the oval</p>
            )}

            <div className="camera-controls">
                {!isStreaming && !error && (
                    <button onClick={start} className="primary-button">
                        Start Camera
                    </button>
                )}
                {error && (
                    <button onClick={start} className="primary-button">
                        Retry
                    </button>
                )}
                {isStreaming && (
                    <>
                        <button onClick={capture} className="capture-button">
                            <span className="capture-icon"></span>
                        </button>
                        <button onClick={stop} className="secondary-button">
                            Stop Camera
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
