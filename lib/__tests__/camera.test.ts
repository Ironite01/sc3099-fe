/**
 * Tests for Camera utility functions
 */

import {
    startCamera,
    stopCamera,
    captureFrame,
    isCameraAvailable,
    checkCameraPermission,
    attachStreamToVideo,
    getVideoResolution,
} from '../camera';

describe('Camera Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('startCamera', () => {
        it('should return media stream on success', async () => {
            const mockStream = {
                getTracks: () => [{ stop: jest.fn() }],
            } as unknown as MediaStream;

            (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce(mockStream);

            const result = await startCamera();

            expect(result).toBe(mockStream);
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                },
                audio: false,
            });
        });

        it('should use custom constraints', async () => {
            const mockStream = {
                getTracks: () => [{ stop: jest.fn() }],
            } as unknown as MediaStream;

            (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce(mockStream);

            const customConstraints = {
                facingMode: 'environment' as const,
                width: { ideal: 1280 },
                height: { ideal: 720 },
            };

            await startCamera(customConstraints);

            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
                video: customConstraints,
                audio: false,
            });
        });

        it('should throw error when camera access fails', async () => {
            (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
                new Error('Permission denied')
            );

            await expect(startCamera()).rejects.toThrow(
                'Failed to access camera. Please grant camera permission.'
            );
        });
    });

    describe('stopCamera', () => {
        it('should stop all tracks in the stream', () => {
            const mockStop1 = jest.fn();
            const mockStop2 = jest.fn();
            const mockStream = {
                getTracks: () => [{ stop: mockStop1 }, { stop: mockStop2 }],
            } as unknown as MediaStream;

            stopCamera(mockStream);

            expect(mockStop1).toHaveBeenCalled();
            expect(mockStop2).toHaveBeenCalled();
        });

        it('should handle null stream gracefully', () => {
            expect(() => stopCamera(null)).not.toThrow();
        });
    });

    describe('captureFrame', () => {
        let mockVideo: HTMLVideoElement;
        let mockCanvas: HTMLCanvasElement;
        let mockContext: CanvasRenderingContext2D;

        beforeEach(() => {
            mockContext = {
                translate: jest.fn(),
                scale: jest.fn(),
                drawImage: jest.fn(),
            } as unknown as CanvasRenderingContext2D;

            mockCanvas = {
                width: 0,
                height: 0,
                getContext: jest.fn().mockReturnValue(mockContext),
                toDataURL: jest.fn().mockReturnValue('data:image/jpeg;base64,abc123'),
            } as unknown as HTMLCanvasElement;

            mockVideo = {
                videoWidth: 640,
                videoHeight: 480,
            } as HTMLVideoElement;

            // Mock document.createElement to return our mock canvas
            jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should capture frame and return base64 string', () => {
            const result = captureFrame(mockVideo);

            expect(document.createElement).toHaveBeenCalledWith('canvas');
            expect(mockCanvas.width).toBe(640);
            expect(mockCanvas.height).toBe(480);
            expect(mockContext.drawImage).toHaveBeenCalledWith(mockVideo, 0, 0, 640, 480);
            expect(result).toBe('abc123');
        });

        it('should mirror image by default', () => {
            captureFrame(mockVideo);

            expect(mockContext.translate).toHaveBeenCalledWith(640, 0);
            expect(mockContext.scale).toHaveBeenCalledWith(-1, 1);
        });

        it('should not mirror when mirror is false', () => {
            captureFrame(mockVideo, 0.9, false);

            expect(mockContext.translate).not.toHaveBeenCalled();
            expect(mockContext.scale).not.toHaveBeenCalled();
        });

        it('should use specified quality', () => {
            captureFrame(mockVideo, 0.5);

            expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.5);
        });

        it('should throw error when canvas context is null', () => {
            (mockCanvas.getContext as jest.Mock).mockReturnValueOnce(null);

            expect(() => captureFrame(mockVideo)).toThrow('Failed to get canvas context');
        });

        it('should strip data URL prefix from result', () => {
            (mockCanvas.toDataURL as jest.Mock).mockReturnValueOnce(
                'data:image/jpeg;base64,testbase64data'
            );

            const result = captureFrame(mockVideo);

            expect(result).toBe('testbase64data');
        });
    });

    describe('isCameraAvailable', () => {
        it('should return true when video input device exists', async () => {
            (navigator.mediaDevices.enumerateDevices as jest.Mock).mockResolvedValueOnce([
                { kind: 'audioinput', deviceId: '1' },
                { kind: 'videoinput', deviceId: '2' },
            ]);

            const result = await isCameraAvailable();

            expect(result).toBe(true);
        });

        it('should return false when no video input device exists', async () => {
            (navigator.mediaDevices.enumerateDevices as jest.Mock).mockResolvedValueOnce([
                { kind: 'audioinput', deviceId: '1' },
                { kind: 'audiooutput', deviceId: '2' },
            ]);

            const result = await isCameraAvailable();

            expect(result).toBe(false);
        });

        it('should return false when enumeration fails', async () => {
            (navigator.mediaDevices.enumerateDevices as jest.Mock).mockRejectedValueOnce(
                new Error('Enumeration failed')
            );

            const result = await isCameraAvailable();

            expect(result).toBe(false);
        });

        it('should return false when device list is empty', async () => {
            (navigator.mediaDevices.enumerateDevices as jest.Mock).mockResolvedValueOnce([]);

            const result = await isCameraAvailable();

            expect(result).toBe(false);
        });
    });

    describe('checkCameraPermission', () => {
        it('should return granted when permission is granted', async () => {
            (navigator.permissions.query as jest.Mock).mockResolvedValueOnce({
                state: 'granted',
            });

            const result = await checkCameraPermission();

            expect(result).toBe('granted');
            expect(navigator.permissions.query).toHaveBeenCalledWith({ name: 'camera' });
        });

        it('should return denied when permission is denied', async () => {
            (navigator.permissions.query as jest.Mock).mockResolvedValueOnce({
                state: 'denied',
            });

            const result = await checkCameraPermission();

            expect(result).toBe('denied');
        });

        it('should return prompt when permission needs to be requested', async () => {
            (navigator.permissions.query as jest.Mock).mockResolvedValueOnce({
                state: 'prompt',
            });

            const result = await checkCameraPermission();

            expect(result).toBe('prompt');
        });

        it('should return unavailable when permission API is not supported', async () => {
            (navigator.permissions.query as jest.Mock).mockRejectedValueOnce(
                new Error('Not supported')
            );

            const result = await checkCameraPermission();

            expect(result).toBe('unavailable');
        });
    });

    describe('attachStreamToVideo', () => {
        it('should attach stream to video element', () => {
            const mockStream = {} as MediaStream;
            const mockPlay = jest.fn().mockResolvedValue(undefined);
            const mockVideo = {
                srcObject: null,
                onloadedmetadata: null,
                play: mockPlay,
            } as unknown as HTMLVideoElement;

            attachStreamToVideo(mockVideo, mockStream);

            expect(mockVideo.srcObject).toBe(mockStream);
            expect(mockVideo.onloadedmetadata).toBeDefined();

            // Simulate metadata loaded
            if (mockVideo.onloadedmetadata) {
                (mockVideo.onloadedmetadata as () => void)();
            }

            expect(mockPlay).toHaveBeenCalled();
        });

        it('should handle play error gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const mockStream = {} as MediaStream;
            const mockPlay = jest.fn().mockRejectedValue(new Error('Play failed'));
            const mockVideo = {
                srcObject: null,
                onloadedmetadata: null,
                play: mockPlay,
            } as unknown as HTMLVideoElement;

            attachStreamToVideo(mockVideo, mockStream);

            // Simulate metadata loaded
            if (mockVideo.onloadedmetadata) {
                (mockVideo.onloadedmetadata as () => void)();
            }

            // Wait for promise rejection
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(consoleSpy).toHaveBeenCalled();
                    consoleSpy.mockRestore();
                    resolve();
                }, 0);
            });
        });
    });

    describe('getVideoResolution', () => {
        it('should return video width and height', () => {
            const mockVideo = {
                videoWidth: 1920,
                videoHeight: 1080,
            } as HTMLVideoElement;

            const result = getVideoResolution(mockVideo);

            expect(result).toEqual({ width: 1920, height: 1080 });
        });

        it('should return 0 for uninitialized video', () => {
            const mockVideo = {
                videoWidth: 0,
                videoHeight: 0,
            } as HTMLVideoElement;

            const result = getVideoResolution(mockVideo);

            expect(result).toEqual({ width: 0, height: 0 });
        });
    });
});
