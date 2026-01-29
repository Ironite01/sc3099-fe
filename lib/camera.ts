/**
 * Camera Utilities for SAIV Frontend
 *
 * Provides functions for:
 * - Requesting camera permission
 * - Starting/stopping camera stream
 * - Capturing frames from video
 * - Converting to base64
 */

export interface CameraConstraints {
    facingMode?: 'user' | 'environment';
    width?: { ideal: number };
    height?: { ideal: number };
}

/**
 * Request camera permission and start video stream
 * @param constraints - MediaStreamConstraints for video
 * @returns Promise<MediaStream> - The camera stream
 */
export async function startCamera(
    constraints: CameraConstraints = {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
    }
): Promise<MediaStream> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: constraints,
            audio: false,
        });
        return stream;
    } catch (error) {
        console.error('Camera access error:', error);
        throw new Error('Failed to access camera. Please grant camera permission.');
    }
}

/**
 * Stop all tracks in a media stream
 * @param stream - MediaStream to stop
 */
export function stopCamera(stream: MediaStream | null): void {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

/**
 * Capture a frame from video element as base64 image
 * @param video - HTMLVideoElement to capture from
 * @param quality - JPEG quality (0-1, default 0.9)
 * @param mirror - Mirror the image (default true for selfie mode)
 * @returns Base64 encoded image (without data URL prefix)
 */
export function captureFrame(
    video: HTMLVideoElement,
    quality: number = 0.9,
    mirror: boolean = true
): string {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Mirror the image for selfie mode
    if (mirror) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get data URL and remove prefix
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

    return base64;
}

/**
 * Check if camera is available
 * @returns Promise<boolean> - true if camera is available
 */
export async function isCameraAvailable(): Promise<boolean> {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.some(device => device.kind === 'videoinput');
    } catch (error) {
        console.error('Error checking camera availability:', error);
        return false;
    }
}

/**
 * Request camera permission (without starting stream)
 * @returns Promise<PermissionState> - Permission state ('granted', 'denied', 'prompt')
 */
export async function checkCameraPermission(): Promise<PermissionState | 'unavailable'> {
    try {
        // Try to query permission state
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return result.state;
    } catch (error) {
        // Permission API not supported or camera permission query not supported
        console.warn('Permission API not available:', error);
        return 'unavailable';
    }
}

/**
 * Attach video stream to video element
 * @param video - HTMLVideoElement to attach stream to
 * @param stream - MediaStream to attach
 */
export function attachStreamToVideo(video: HTMLVideoElement, stream: MediaStream): void {
    video.srcObject = stream;
    video.onloadedmetadata = () => {
        video.play().catch(err => {
            console.error('Error playing video:', err);
        });
    };
}

/**
 * Get video resolution from stream
 * @param video - HTMLVideoElement
 * @returns Object with width and height
 */
export function getVideoResolution(video: HTMLVideoElement): { width: number; height: number } {
    return {
        width: video.videoWidth,
        height: video.videoHeight,
    };
}
