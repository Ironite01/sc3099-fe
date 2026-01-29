/**
 * Tests for Geolocation utility functions
 */

import {
    getCurrentPosition,
    calculateDistance,
    isWithinRadius,
    checkGeolocationPermission,
    watchPosition,
    clearWatch,
    formatDistance,
} from '../geolocation';

describe('Geolocation Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCurrentPosition', () => {
        it('should return position when geolocation succeeds', async () => {
            const mockPosition = {
                coords: {
                    latitude: 1.3521,
                    longitude: 103.8198,
                    accuracy: 10,
                },
                timestamp: 1705312200000,
            };

            (navigator.geolocation.getCurrentPosition as jest.Mock).mockImplementation(
                (success) => success(mockPosition)
            );

            const result = await getCurrentPosition();

            expect(result).toEqual({
                latitude: 1.3521,
                longitude: 103.8198,
                accuracy: 10,
                timestamp: 1705312200000,
            });
        });

        it('should reject with permission denied error', async () => {
            const mockError = {
                code: 1, // PERMISSION_DENIED
                PERMISSION_DENIED: 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT: 3,
            };

            (navigator.geolocation.getCurrentPosition as jest.Mock).mockImplementation(
                (_, error) => error(mockError)
            );

            await expect(getCurrentPosition()).rejects.toThrow(
                'Location permission denied. Please enable location access.'
            );
        });

        it('should reject with position unavailable error', async () => {
            const mockError = {
                code: 2, // POSITION_UNAVAILABLE
                PERMISSION_DENIED: 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT: 3,
            };

            (navigator.geolocation.getCurrentPosition as jest.Mock).mockImplementation(
                (_, error) => error(mockError)
            );

            await expect(getCurrentPosition()).rejects.toThrow(
                'Location information unavailable.'
            );
        });

        it('should reject with timeout error', async () => {
            const mockError = {
                code: 3, // TIMEOUT
                PERMISSION_DENIED: 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT: 3,
            };

            (navigator.geolocation.getCurrentPosition as jest.Mock).mockImplementation(
                (_, error) => error(mockError)
            );

            await expect(getCurrentPosition()).rejects.toThrow(
                'Location request timed out. Please try again.'
            );
        });

        it('should reject when geolocation is not supported', async () => {
            const originalGeolocation = navigator.geolocation;
            Object.defineProperty(navigator, 'geolocation', {
                value: undefined,
                writable: true,
            });

            await expect(getCurrentPosition()).rejects.toThrow(
                'Geolocation is not supported by your browser'
            );

            Object.defineProperty(navigator, 'geolocation', {
                value: originalGeolocation,
                writable: true,
            });
        });

        it('should pass options to getCurrentPosition', async () => {
            const mockPosition = {
                coords: { latitude: 0, longitude: 0 },
                timestamp: Date.now(),
            };

            (navigator.geolocation.getCurrentPosition as jest.Mock).mockImplementation(
                (success) => success(mockPosition)
            );

            const options = {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 1000,
            };

            await getCurrentPosition(options);

            expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledWith(
                expect.any(Function),
                expect.any(Function),
                options
            );
        });
    });

    describe('calculateDistance', () => {
        it('should calculate distance between two identical points as 0', () => {
            const distance = calculateDistance(1.3521, 103.8198, 1.3521, 103.8198);
            expect(distance).toBe(0);
        });

        it('should calculate distance between Singapore and NTU (~22km)', () => {
            // Marina Bay Sands: 1.2838, 103.8591
            // NTU: 1.3483, 103.6831
            const distance = calculateDistance(1.2838, 103.8591, 1.3483, 103.6831);
            // Expected distance is approximately 20-22km
            expect(distance).toBeGreaterThan(18000);
            expect(distance).toBeLessThan(25000);
        });

        it('should calculate distance between New York and London (~5500km)', () => {
            // NYC: 40.7128, -74.0060
            // London: 51.5074, -0.1278
            const distance = calculateDistance(40.7128, -74.006, 51.5074, -0.1278);
            // Expected distance is approximately 5570km
            expect(distance).toBeGreaterThan(5500000);
            expect(distance).toBeLessThan(5700000);
        });

        it('should handle negative coordinates', () => {
            // Sydney: -33.8688, 151.2093
            // Auckland: -36.8485, 174.7633
            const distance = calculateDistance(-33.8688, 151.2093, -36.8485, 174.7633);
            // Expected distance is approximately 2150km
            expect(distance).toBeGreaterThan(2000000);
            expect(distance).toBeLessThan(2300000);
        });

        it('should return symmetric distance', () => {
            const d1 = calculateDistance(1.3521, 103.8198, 1.2838, 103.8591);
            const d2 = calculateDistance(1.2838, 103.8591, 1.3521, 103.8198);
            expect(d1).toBeCloseTo(d2, 5);
        });
    });

    describe('isWithinRadius', () => {
        it('should return true when user is within radius', () => {
            // Same location
            const result = isWithinRadius(1.3521, 103.8198, 1.3521, 103.8198, 100);
            expect(result).toBe(true);
        });

        it('should return true when user is at the edge of radius', () => {
            // Approximately 50m apart
            const result = isWithinRadius(1.3521, 103.8198, 1.35215, 103.81985, 100);
            expect(result).toBe(true);
        });

        it('should return false when user is outside radius', () => {
            // Approximately 1km apart
            const result = isWithinRadius(1.3521, 103.8198, 1.3621, 103.8198, 100);
            expect(result).toBe(false);
        });

        it('should handle very small radius', () => {
            const result = isWithinRadius(1.3521, 103.8198, 1.35211, 103.81981, 1);
            expect(result).toBe(false);
        });

        it('should handle very large radius', () => {
            // NYC to London with 10000km radius
            const result = isWithinRadius(40.7128, -74.006, 51.5074, -0.1278, 10000000);
            expect(result).toBe(true);
        });
    });

    describe('checkGeolocationPermission', () => {
        it('should return granted when permission is granted', async () => {
            (navigator.permissions.query as jest.Mock).mockResolvedValueOnce({
                state: 'granted',
            });

            const result = await checkGeolocationPermission();
            expect(result).toBe('granted');
        });

        it('should return denied when permission is denied', async () => {
            (navigator.permissions.query as jest.Mock).mockResolvedValueOnce({
                state: 'denied',
            });

            const result = await checkGeolocationPermission();
            expect(result).toBe('denied');
        });

        it('should return prompt when permission needs to be requested', async () => {
            (navigator.permissions.query as jest.Mock).mockResolvedValueOnce({
                state: 'prompt',
            });

            const result = await checkGeolocationPermission();
            expect(result).toBe('prompt');
        });

        it('should return unavailable when permission API is not available', async () => {
            (navigator.permissions.query as jest.Mock).mockRejectedValueOnce(
                new Error('Not supported')
            );

            const result = await checkGeolocationPermission();
            expect(result).toBe('unavailable');
        });
    });

    describe('watchPosition', () => {
        it('should call callback with position updates', () => {
            const mockWatchId = 123;
            const mockPosition = {
                coords: {
                    latitude: 1.3521,
                    longitude: 103.8198,
                    accuracy: 10,
                },
                timestamp: Date.now(),
            };

            (navigator.geolocation.watchPosition as jest.Mock).mockImplementation(
                (success) => {
                    success(mockPosition);
                    return mockWatchId;
                }
            );

            const callback = jest.fn();
            const watchId = watchPosition(callback);

            expect(watchId).toBe(mockWatchId);
            expect(callback).toHaveBeenCalledWith({
                latitude: 1.3521,
                longitude: 103.8198,
                accuracy: 10,
                timestamp: mockPosition.timestamp,
            });
        });

        it('should call error callback on error', () => {
            const mockError = {
                code: 1,
                PERMISSION_DENIED: 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT: 3,
            };

            (navigator.geolocation.watchPosition as jest.Mock).mockImplementation(
                (_, error) => {
                    error(mockError);
                    return 1;
                }
            );

            const callback = jest.fn();
            const errorCallback = jest.fn();
            watchPosition(callback, errorCallback);

            expect(errorCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Location permission denied',
                })
            );
        });

        it('should throw when geolocation is not supported', () => {
            const originalGeolocation = navigator.geolocation;
            Object.defineProperty(navigator, 'geolocation', {
                value: undefined,
                writable: true,
            });

            expect(() => watchPosition(jest.fn())).toThrow(
                'Geolocation is not supported by your browser'
            );

            Object.defineProperty(navigator, 'geolocation', {
                value: originalGeolocation,
                writable: true,
            });
        });
    });

    describe('clearWatch', () => {
        it('should call navigator.geolocation.clearWatch', () => {
            clearWatch(123);
            expect(navigator.geolocation.clearWatch).toHaveBeenCalledWith(123);
        });
    });

    describe('formatDistance', () => {
        it('should format distance in meters for small distances', () => {
            expect(formatDistance(50)).toBe('50 m');
            expect(formatDistance(100)).toBe('100 m');
            expect(formatDistance(999)).toBe('999 m');
        });

        it('should format distance in kilometers for large distances', () => {
            expect(formatDistance(1000)).toBe('1.0 km');
            expect(formatDistance(1500)).toBe('1.5 km');
            expect(formatDistance(10000)).toBe('10.0 km');
        });

        it('should round meters to nearest integer', () => {
            expect(formatDistance(50.4)).toBe('50 m');
            expect(formatDistance(50.6)).toBe('51 m');
        });

        it('should show one decimal for kilometers', () => {
            expect(formatDistance(1234)).toBe('1.2 km');
            expect(formatDistance(1567)).toBe('1.6 km');
        });
    });
});
