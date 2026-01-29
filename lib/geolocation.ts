/**
 * Geolocation Utilities for SAIV Frontend
 *
 * Provides functions for:
 * - Requesting geolocation permission
 * - Getting current position
 * - Calculating distance (Haversine formula)
 * - Checking if user is within allowed radius
 */

export interface Position {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: number;
}

/**
 * Get current geolocation position
 * @param options - PositionOptions (timeout, maximumAge, enableHighAccuracy)
 * @returns Promise<Position> - Current position
 */
export async function getCurrentPosition(
    options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
    }
): Promise<Position> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp,
                });
            },
            (error) => {
                let errorMessage = 'Failed to get location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied. Please enable location access.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out. Please try again.';
                        break;
                }
                reject(new Error(errorMessage));
            },
            options
        );
    });
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of point 1
 * @param lon1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lon2 - Longitude of point 2
 * @returns Distance in meters
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    return distance;
}

/**
 * Check if user is within allowed radius of a location
 * @param userLat - User latitude
 * @param userLon - User longitude
 * @param targetLat - Target latitude
 * @param targetLon - Target longitude
 * @param radiusMeters - Allowed radius in meters
 * @returns true if within radius
 */
export function isWithinRadius(
    userLat: number,
    userLon: number,
    targetLat: number,
    targetLon: number,
    radiusMeters: number
): boolean {
    const distance = calculateDistance(userLat, userLon, targetLat, targetLon);
    return distance <= radiusMeters;
}

/**
 * Check geolocation permission status
 * @returns Promise<PermissionState> - Permission state ('granted', 'denied', 'prompt')
 */
export async function checkGeolocationPermission(): Promise<PermissionState | 'unavailable'> {
    try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state;
    } catch (error) {
        console.warn('Permission API not available:', error);
        return 'unavailable';
    }
}

/**
 * Watch position changes (for continuous tracking)
 * @param callback - Callback function to handle position updates
 * @param errorCallback - Callback function to handle errors
 * @param options - PositionOptions
 * @returns Watch ID to clear later
 */
export function watchPosition(
    callback: (position: Position) => void,
    errorCallback?: (error: Error) => void,
    options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
    }
): number {
    if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
    }

    return navigator.geolocation.watchPosition(
        (position) => {
            callback({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp,
            });
        },
        (error) => {
            if (errorCallback) {
                let errorMessage = 'Failed to watch location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }
                errorCallback(new Error(errorMessage));
            }
        },
        options
    );
}

/**
 * Clear position watch
 * @param watchId - Watch ID returned by watchPosition
 */
export function clearWatch(watchId: number): void {
    navigator.geolocation.clearWatch(watchId);
}

/**
 * Format distance for display
 * @param meters - Distance in meters
 * @returns Formatted string (e.g., "50 m" or "1.2 km")
 */
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
}
