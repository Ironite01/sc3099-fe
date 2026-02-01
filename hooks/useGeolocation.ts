'use client';

import { useState, useCallback } from 'react';
import type { GeolocationCoords } from '@/lib/types';

interface UseGeolocationReturn {
    coords: GeolocationCoords | null;
    error: string | null;
    isLoading: boolean;
    requestLocation: () => Promise<GeolocationCoords | null>;
}

export function useGeolocation(): UseGeolocationReturn {
    const [coords, setCoords] = useState<GeolocationCoords | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const requestLocation = useCallback(async (): Promise<GeolocationCoords | null> => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return null;
        }

        setIsLoading(true);
        setError(null);

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const locationCoords: GeolocationCoords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                    };
                    setCoords(locationCoords);
                    setIsLoading(false);
                    resolve(locationCoords);
                },
                (err) => {
                    let message: string;
                    switch (err.code) {
                        case err.PERMISSION_DENIED:
                            message = 'Location permission denied';
                            break;
                        case err.POSITION_UNAVAILABLE:
                            message = 'Location information unavailable';
                            break;
                        case err.TIMEOUT:
                            message = 'Location request timed out';
                            break;
                        default:
                            message = 'An unknown error occurred';
                    }
                    setError(message);
                    setIsLoading(false);
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        });
    }, []);

    return {
        coords,
        error,
        isLoading,
        requestLocation,
    };
}
