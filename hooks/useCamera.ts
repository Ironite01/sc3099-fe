'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface UseCameraOptions {
    facingMode?: 'user' | 'environment';
    width?: number;
    height?: number;
}

interface UseCameraReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    stream: MediaStream | null;
    isActive: boolean;
    error: string | null;
    startCamera: () => Promise<void>;
    stopCamera: () => void;
    capturePhoto: () => string | null;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
    const { facingMode = 'user', width = 640, height = 480 } = options;

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startCamera = useCallback(async () => {
        try {
            setError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: width },
                    height: { ideal: height },
                },
            });

            streamRef.current = mediaStream;

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                await videoRef.current.play();
            }

            setIsActive(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Camera access denied';
            setError(message);
            setIsActive(false);
        }
    }, [facingMode, width, height]);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsActive(false);
    }, []);

    const capturePhoto = useCallback((): string | null => {
        if (!videoRef.current || !canvasRef.current) return null;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);

        return canvas.toDataURL('image/jpeg', 0.9);
    }, []);

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        if (isActive && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(console.error);
        }
    });

    return {
        videoRef,
        canvasRef,
        stream: streamRef.current,
        isActive,
        error,
        startCamera,
        stopCamera,
        capturePhoto,
    };
}
