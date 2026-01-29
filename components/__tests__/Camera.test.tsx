/**
 * Tests for Camera component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Camera from '../Camera';
import * as cameraUtils from '@/lib/camera';

// Mock camera utilities
jest.mock('@/lib/camera', () => ({
    startCamera: jest.fn(),
    stopCamera: jest.fn(),
    captureFrame: jest.fn(),
}));

describe('Camera Component', () => {
    const mockOnCapture = jest.fn();
    const mockOnError = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Initial Render', () => {
        it('should render camera placeholder when not streaming', () => {
            render(<Camera onCapture={mockOnCapture} />);

            expect(screen.getByText('Camera not started')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /start camera/i })).toBeInTheDocument();
        });

        it('should render video element', () => {
            render(<Camera onCapture={mockOnCapture} />);

            const video = document.querySelector('video');
            expect(video).toBeInTheDocument();
            // React renders boolean attributes as properties, not HTML attributes
            expect(video).toHaveProperty('autoplay', true);
            expect(video).toHaveProperty('muted', true);
        });

        it('should apply mirror transform by default', () => {
            render(<Camera onCapture={mockOnCapture} />);

            const video = document.querySelector('video');
            expect(video).toHaveStyle({ transform: 'scaleX(-1)' });
        });

        it('should not apply mirror transform when mirror is false', () => {
            render(<Camera onCapture={mockOnCapture} mirror={false} />);

            const video = document.querySelector('video');
            expect(video).toHaveStyle({ transform: 'none' });
        });
    });

    describe('Starting Camera', () => {
        it('should start camera when Start Camera button is clicked', async () => {
            const mockStream = {
                getTracks: () => [{ stop: jest.fn() }],
            } as unknown as MediaStream;

            (cameraUtils.startCamera as jest.Mock).mockResolvedValueOnce(mockStream);

            render(<Camera onCapture={mockOnCapture} />);

            const startButton = screen.getByRole('button', { name: /start camera/i });
            await act(async () => {
                fireEvent.click(startButton);
            });

            expect(cameraUtils.startCamera).toHaveBeenCalledWith({
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 },
            });
        });

        it('should auto-start camera when autoStart is true', async () => {
            const mockStream = {
                getTracks: () => [{ stop: jest.fn() }],
            } as unknown as MediaStream;

            (cameraUtils.startCamera as jest.Mock).mockResolvedValueOnce(mockStream);

            await act(async () => {
                render(<Camera onCapture={mockOnCapture} autoStart={true} />);
            });

            expect(cameraUtils.startCamera).toHaveBeenCalled();
        });

        it('should show error when camera fails to start', async () => {
            (cameraUtils.startCamera as jest.Mock).mockRejectedValueOnce(
                new Error('Permission denied')
            );

            render(<Camera onCapture={mockOnCapture} onError={mockOnError} />);

            const startButton = screen.getByRole('button', { name: /start camera/i });
            await act(async () => {
                fireEvent.click(startButton);
            });

            await waitFor(() => {
                expect(screen.getByText('Permission denied')).toBeInTheDocument();
            });
            expect(mockOnError).toHaveBeenCalledWith('Permission denied');
        });

        it('should show Retry button when there is an error', async () => {
            (cameraUtils.startCamera as jest.Mock).mockRejectedValueOnce(
                new Error('Camera error')
            );

            render(<Camera onCapture={mockOnCapture} />);

            const startButton = screen.getByRole('button', { name: /start camera/i });
            await act(async () => {
                fireEvent.click(startButton);
            });

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
            });
        });
    });

    describe('Streaming State', () => {
        it('should show capture and stop buttons when streaming', async () => {
            const mockStream = {
                getTracks: () => [{ stop: jest.fn() }],
            } as unknown as MediaStream;

            (cameraUtils.startCamera as jest.Mock).mockResolvedValueOnce(mockStream);

            render(<Camera onCapture={mockOnCapture} />);

            const startButton = screen.getByRole('button', { name: /start camera/i });
            await act(async () => {
                fireEvent.click(startButton);
            });

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /stop camera/i })).toBeInTheDocument();
            });
        });

        it('should show face guide hint when streaming', async () => {
            const mockStream = {
                getTracks: () => [{ stop: jest.fn() }],
            } as unknown as MediaStream;

            (cameraUtils.startCamera as jest.Mock).mockResolvedValueOnce(mockStream);

            render(<Camera onCapture={mockOnCapture} />);

            const startButton = screen.getByRole('button', { name: /start camera/i });
            await act(async () => {
                fireEvent.click(startButton);
            });

            await waitFor(() => {
                expect(screen.getByText('Position your face within the oval')).toBeInTheDocument();
            });
        });
    });

    describe('Capturing Photos', () => {
        it('should capture frame and call onCapture', async () => {
            const mockStream = {
                getTracks: () => [{ stop: jest.fn() }],
            } as unknown as MediaStream;

            (cameraUtils.startCamera as jest.Mock).mockResolvedValueOnce(mockStream);
            (cameraUtils.captureFrame as jest.Mock).mockReturnValueOnce('base64imagedata');

            render(<Camera onCapture={mockOnCapture} />);

            const startButton = screen.getByRole('button', { name: /start camera/i });
            await act(async () => {
                fireEvent.click(startButton);
            });

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /stop camera/i })).toBeInTheDocument();
            });

            const captureButton = document.querySelector('.capture-button');
            expect(captureButton).toBeInTheDocument();

            await act(async () => {
                fireEvent.click(captureButton!);
            });

            expect(cameraUtils.captureFrame).toHaveBeenCalled();
            expect(mockOnCapture).toHaveBeenCalledWith('base64imagedata');
        });

        it('should use specified quality for capture', async () => {
            const mockStream = {
                getTracks: () => [{ stop: jest.fn() }],
            } as unknown as MediaStream;

            (cameraUtils.startCamera as jest.Mock).mockResolvedValueOnce(mockStream);
            (cameraUtils.captureFrame as jest.Mock).mockReturnValueOnce('base64');

            render(<Camera onCapture={mockOnCapture} quality={0.5} />);

            const startButton = screen.getByRole('button', { name: /start camera/i });
            await act(async () => {
                fireEvent.click(startButton);
            });

            await waitFor(() => {
                expect(document.querySelector('.capture-button')).toBeInTheDocument();
            });

            const captureButton = document.querySelector('.capture-button');
            await act(async () => {
                fireEvent.click(captureButton!);
            });

            expect(cameraUtils.captureFrame).toHaveBeenCalledWith(
                expect.any(Object),
                0.5,
                true
            );
        });

        it('should show error when capture fails', async () => {
            const mockStream = {
                getTracks: () => [{ stop: jest.fn() }],
            } as unknown as MediaStream;

            (cameraUtils.startCamera as jest.Mock).mockResolvedValueOnce(mockStream);
            (cameraUtils.captureFrame as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Capture failed');
            });

            render(<Camera onCapture={mockOnCapture} onError={mockOnError} />);

            const startButton = screen.getByRole('button', { name: /start camera/i });
            await act(async () => {
                fireEvent.click(startButton);
            });

            await waitFor(() => {
                expect(document.querySelector('.capture-button')).toBeInTheDocument();
            });

            const captureButton = document.querySelector('.capture-button');
            await act(async () => {
                fireEvent.click(captureButton!);
            });

            expect(mockOnError).toHaveBeenCalledWith('Capture failed');
        });
    });

    describe('Stopping Camera', () => {
        it('should stop camera when Stop Camera button is clicked', async () => {
            const mockStop = jest.fn();
            const mockStream = {
                getTracks: () => [{ stop: mockStop }],
            } as unknown as MediaStream;

            (cameraUtils.startCamera as jest.Mock).mockResolvedValueOnce(mockStream);

            render(<Camera onCapture={mockOnCapture} />);

            const startButton = screen.getByRole('button', { name: /start camera/i });
            await act(async () => {
                fireEvent.click(startButton);
            });

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /stop camera/i })).toBeInTheDocument();
            });

            const stopButton = screen.getByRole('button', { name: /stop camera/i });
            await act(async () => {
                fireEvent.click(stopButton);
            });

            expect(cameraUtils.stopCamera).toHaveBeenCalledWith(mockStream);
        });

        it('should stop camera on unmount', async () => {
            const mockStream = {
                getTracks: () => [{ stop: jest.fn() }],
            } as unknown as MediaStream;

            (cameraUtils.startCamera as jest.Mock).mockResolvedValueOnce(mockStream);

            const { unmount } = render(<Camera onCapture={mockOnCapture} autoStart={true} />);

            await waitFor(() => {
                expect(cameraUtils.startCamera).toHaveBeenCalled();
            });

            unmount();

            expect(cameraUtils.stopCamera).toHaveBeenCalled();
        });
    });
});
