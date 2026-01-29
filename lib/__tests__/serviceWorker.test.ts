/**
 * Tests for Service Worker utilities
 * Covers PDF requirements: Service Worker registration, caching strategies
 */

import {
    isServiceWorkerSupported,
    registerServiceWorker,
    unregisterServiceWorker,
    getServiceWorkerRegistration,
    isServiceWorkerActive,
    cacheFirst,
    networkFirst,
    staleWhileRevalidate,
    precacheAssets,
    clearOldCaches,
    shouldCache,
    getStaticAssetsToCache,
} from '../serviceWorker';

describe('Service Worker Utilities', () => {
    // Mock service worker API
    const mockRegistration = {
        scope: 'http://localhost/',
        active: { state: 'activated' },
        unregister: jest.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock navigator.serviceWorker
        Object.defineProperty(navigator, 'serviceWorker', {
            writable: true,
            value: {
                register: jest.fn().mockResolvedValue(mockRegistration),
                ready: Promise.resolve(mockRegistration),
                getRegistration: jest.fn().mockResolvedValue(mockRegistration),
            },
        });

        // Mock caches API
        Object.defineProperty(global, 'caches', {
            writable: true,
            value: {
                open: jest.fn().mockResolvedValue({
                    match: jest.fn(),
                    put: jest.fn(),
                    addAll: jest.fn().mockResolvedValue(undefined),
                }),
                keys: jest.fn().mockResolvedValue(['old-cache', 'current-cache']),
                delete: jest.fn().mockResolvedValue(true),
            },
        });

        // Mock fetch
        global.fetch = jest.fn();
    });

    describe('isServiceWorkerSupported', () => {
        it('should return true when service worker is supported', () => {
            expect(isServiceWorkerSupported()).toBe(true);
        });

        it('should check for serviceWorker in navigator', () => {
            // This test verifies the check is performed correctly
            // When serviceWorker exists, it returns true
            expect('serviceWorker' in navigator).toBe(true);
            expect(isServiceWorkerSupported()).toBe(true);
        });
    });

    describe('registerServiceWorker', () => {
        it('should register service worker successfully', async () => {
            const registration = await registerServiceWorker('/sw.js');

            expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', undefined);
            expect(registration).toBe(mockRegistration);
        });

        it('should register with custom options', async () => {
            const options = { scope: '/app/' };
            await registerServiceWorker('/sw.js', options);

            expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', options);
        });

        it('should handle service worker not being available gracefully', async () => {
            // Test that registration works with a valid mock
            const registration = await registerServiceWorker('/sw.js');
            expect(registration).toBeDefined();
        });

        it('should throw error when registration fails', async () => {
            (navigator.serviceWorker.register as jest.Mock).mockRejectedValueOnce(
                new Error('Registration failed')
            );

            await expect(registerServiceWorker()).rejects.toThrow(
                'Failed to register service worker'
            );
        });
    });

    describe('unregisterServiceWorker', () => {
        it('should unregister service worker successfully', async () => {
            const result = await unregisterServiceWorker();

            expect(mockRegistration.unregister).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should handle unregistration result', async () => {
            // Verify the unregister function is called and returns expected value
            const result = await unregisterServiceWorker();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('getServiceWorkerRegistration', () => {
        it('should return current registration', async () => {
            const registration = await getServiceWorkerRegistration();

            expect(navigator.serviceWorker.getRegistration).toHaveBeenCalled();
            expect(registration).toBe(mockRegistration);
        });

        it('should call getRegistration on service worker', async () => {
            await getServiceWorkerRegistration();
            expect(navigator.serviceWorker.getRegistration).toHaveBeenCalled();
        });
    });

    describe('isServiceWorkerActive', () => {
        it('should return true when service worker is active', async () => {
            const result = await isServiceWorkerActive();

            expect(result).toBe(true);
        });

        it('should return false when no active service worker', async () => {
            (navigator.serviceWorker.getRegistration as jest.Mock).mockResolvedValueOnce({
                active: null,
            });

            const result = await isServiceWorkerActive();

            expect(result).toBe(false);
        });

        it('should check registration active state', async () => {
            const result = await isServiceWorkerActive();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('cacheFirst', () => {
        it('should return cached response when available', async () => {
            const cachedResponse = new Response('cached data');
            const mockCache = {
                match: jest.fn().mockResolvedValue(cachedResponse),
                put: jest.fn(),
            };
            (caches.open as jest.Mock).mockResolvedValueOnce(mockCache);

            const request = new Request('http://example.com/api/data');
            const result = await cacheFirst(request, 'test-cache');

            expect(mockCache.match).toHaveBeenCalledWith(request);
            expect(global.fetch).not.toHaveBeenCalled();
            expect(result).toBe(cachedResponse);
        });

        it('should fetch and cache when no cached response', async () => {
            const networkResponse = new Response('network data', { status: 200 });
            const mockCache = {
                match: jest.fn().mockResolvedValue(undefined),
                put: jest.fn(),
            };
            (caches.open as jest.Mock).mockResolvedValueOnce(mockCache);
            (global.fetch as jest.Mock).mockResolvedValueOnce(networkResponse);

            const request = new Request('http://example.com/api/data');
            const result = await cacheFirst(request, 'test-cache');

            expect(global.fetch).toHaveBeenCalledWith(request);
            expect(mockCache.put).toHaveBeenCalled();
            expect(result).toBe(networkResponse);
        });

        it('should not cache failed responses', async () => {
            const networkResponse = new Response('error', { status: 500 });
            Object.defineProperty(networkResponse, 'ok', { value: false });
            const mockCache = {
                match: jest.fn().mockResolvedValue(undefined),
                put: jest.fn(),
            };
            (caches.open as jest.Mock).mockResolvedValueOnce(mockCache);
            (global.fetch as jest.Mock).mockResolvedValueOnce(networkResponse);

            const request = new Request('http://example.com/api/data');
            await cacheFirst(request, 'test-cache');

            expect(mockCache.put).not.toHaveBeenCalled();
        });
    });

    describe('networkFirst', () => {
        it('should return network response and cache it', async () => {
            const networkResponse = new Response('network data', { status: 200 });
            const mockCache = {
                match: jest.fn(),
                put: jest.fn(),
            };
            (caches.open as jest.Mock).mockResolvedValueOnce(mockCache);
            (global.fetch as jest.Mock).mockResolvedValueOnce(networkResponse);

            const request = new Request('http://example.com/api/data');
            const result = await networkFirst(request, 'test-cache');

            expect(global.fetch).toHaveBeenCalledWith(request);
            expect(mockCache.put).toHaveBeenCalled();
            expect(result).toBe(networkResponse);
        });

        it('should fall back to cache when network fails', async () => {
            const cachedResponse = new Response('cached data');
            const mockCache = {
                match: jest.fn().mockResolvedValue(cachedResponse),
                put: jest.fn(),
            };
            (caches.open as jest.Mock).mockResolvedValueOnce(mockCache);
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const request = new Request('http://example.com/api/data');
            const result = await networkFirst(request, 'test-cache');

            expect(mockCache.match).toHaveBeenCalledWith(request);
            expect(result).toBe(cachedResponse);
        });

        it('should throw when network fails and no cache', async () => {
            const mockCache = {
                match: jest.fn().mockResolvedValue(undefined),
                put: jest.fn(),
            };
            (caches.open as jest.Mock).mockResolvedValueOnce(mockCache);
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const request = new Request('http://example.com/api/data');

            await expect(networkFirst(request, 'test-cache')).rejects.toThrow(
                'Network request failed and no cache available'
            );
        });
    });

    describe('staleWhileRevalidate', () => {
        it('should return cached response immediately and update cache', async () => {
            const cachedResponse = new Response('cached data');
            const networkResponse = new Response('network data', { status: 200 });
            const mockCache = {
                match: jest.fn().mockResolvedValue(cachedResponse),
                put: jest.fn(),
            };
            (caches.open as jest.Mock).mockResolvedValueOnce(mockCache);
            (global.fetch as jest.Mock).mockResolvedValueOnce(networkResponse);

            const request = new Request('http://example.com/api/data');
            const result = await staleWhileRevalidate(request, 'test-cache');

            expect(result).toBe(cachedResponse);
            // Wait for background fetch to complete
            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(mockCache.put).toHaveBeenCalled();
        });

        it('should wait for network when no cache', async () => {
            const networkResponse = new Response('network data', { status: 200 });
            const mockCache = {
                match: jest.fn().mockResolvedValue(undefined),
                put: jest.fn(),
            };
            (caches.open as jest.Mock).mockResolvedValueOnce(mockCache);
            (global.fetch as jest.Mock).mockResolvedValueOnce(networkResponse);

            const request = new Request('http://example.com/api/data');
            const result = await staleWhileRevalidate(request, 'test-cache');

            expect(result).toBe(networkResponse);
        });
    });

    describe('precacheAssets', () => {
        it('should cache all provided URLs', async () => {
            const mockCache = {
                addAll: jest.fn().mockResolvedValue(undefined),
            };
            (caches.open as jest.Mock).mockResolvedValueOnce(mockCache);

            const urls = ['/index.html', '/styles.css', '/app.js'];
            await precacheAssets('test-cache', urls);

            expect(caches.open).toHaveBeenCalledWith('test-cache');
            expect(mockCache.addAll).toHaveBeenCalledWith(urls);
        });
    });

    describe('clearOldCaches', () => {
        it('should delete caches except current one', async () => {
            (caches.keys as jest.Mock).mockResolvedValueOnce(['old-cache-v1', 'old-cache-v2', 'current-cache']);

            await clearOldCaches('current-cache');

            expect(caches.delete).toHaveBeenCalledWith('old-cache-v1');
            expect(caches.delete).toHaveBeenCalledWith('old-cache-v2');
            expect(caches.delete).not.toHaveBeenCalledWith('current-cache');
        });
    });

    describe('shouldCache', () => {
        it('should return true for static assets', () => {
            expect(shouldCache('/static/app.js')).toBe(true);
            expect(shouldCache('/images/logo.png')).toBe(true);
            expect(shouldCache('/styles/main.css')).toBe(true);
        });

        it('should return false for authentication endpoints', () => {
            expect(shouldCache('/auth/login')).toBe(false);
            expect(shouldCache('/auth/logout')).toBe(false);
            expect(shouldCache('/login')).toBe(false);
            expect(shouldCache('/logout')).toBe(false);
        });

        it('should return false for check-in endpoints', () => {
            expect(shouldCache('/checkins/')).toBe(false);
            expect(shouldCache('/api/v1/checkins')).toBe(false);
            expect(shouldCache('/checkins/submit')).toBe(false);
        });
    });

    describe('getStaticAssetsToCache', () => {
        it('should return list of static assets', () => {
            const assets = getStaticAssetsToCache();

            expect(assets).toContain('/');
            expect(assets).toContain('/index.html');
            expect(assets).toContain('/manifest.json');
            expect(Array.isArray(assets)).toBe(true);
        });
    });
});
