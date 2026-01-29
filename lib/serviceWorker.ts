/**
 * Service Worker utilities for PWA functionality
 * Handles registration, caching strategies, and offline support
 */

export type CacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate';

export interface ServiceWorkerConfig {
    cacheName: string;
    cacheStrategy: CacheStrategy;
    urlsToCache: string[];
}

/**
 * Check if service workers are supported in the browser
 */
export function isServiceWorkerSupported(): boolean {
    return 'serviceWorker' in navigator;
}

/**
 * Register a service worker
 * @param swPath Path to the service worker file
 * @param options Registration options
 */
export async function registerServiceWorker(
    swPath: string = '/sw.js',
    options?: RegistrationOptions
): Promise<ServiceWorkerRegistration | null> {
    if (!isServiceWorkerSupported()) {
        console.warn('Service workers are not supported in this browser');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register(swPath, options);
        console.log('Service Worker registered successfully:', registration.scope);
        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        throw new Error('Failed to register service worker');
    }
}

/**
 * Unregister all service workers
 */
export async function unregisterServiceWorker(): Promise<boolean> {
    if (!isServiceWorkerSupported()) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const result = await registration.unregister();
        return result;
    } catch (error) {
        console.error('Failed to unregister service worker:', error);
        return false;
    }
}

/**
 * Get the current service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | undefined> {
    if (!isServiceWorkerSupported()) {
        return undefined;
    }

    return await navigator.serviceWorker.getRegistration();
}

/**
 * Check if a service worker is active
 */
export async function isServiceWorkerActive(): Promise<boolean> {
    if (!isServiceWorkerSupported()) {
        return false;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.active !== null && registration?.active !== undefined;
}

/**
 * Cache-first strategy: Serve from cache, fall back to network
 * Best for: Static assets (JS, CSS, images)
 */
export async function cacheFirst(
    request: Request,
    cacheName: string
): Promise<Response> {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    const networkResponse = await fetch(request);

    // Only cache successful responses
    if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
    }

    return networkResponse;
}

/**
 * Network-first strategy: Try network, fall back to cache
 * Best for: API calls that need fresh data but work offline
 */
export async function networkFirst(
    request: Request,
    cacheName: string
): Promise<Response> {
    const cache = await caches.open(cacheName);

    try {
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        throw new Error('Network request failed and no cache available');
    }
}

/**
 * Stale-while-revalidate: Serve cache immediately, update in background
 * Best for: Content that changes but doesn't need to be instantly fresh
 */
export async function staleWhileRevalidate(
    request: Request,
    cacheName: string
): Promise<Response> {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    // Fetch in background to update cache
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    });

    // Return cached response immediately if available, otherwise wait for network
    return cachedResponse || fetchPromise;
}

/**
 * Pre-cache static assets during service worker installation
 */
export async function precacheAssets(
    cacheName: string,
    urls: string[]
): Promise<void> {
    const cache = await caches.open(cacheName);
    await cache.addAll(urls);
}

/**
 * Clear old caches (useful during service worker activation)
 */
export async function clearOldCaches(currentCacheName: string): Promise<void> {
    const cacheNames = await caches.keys();

    await Promise.all(
        cacheNames
            .filter((name) => name !== currentCacheName)
            .map((name) => caches.delete(name))
    );
}

/**
 * Check if a URL should be cached
 * Do NOT cache: Authentication responses, check-in submissions
 */
export function shouldCache(url: string): boolean {
    const noCachePatterns = [
        '/auth/',
        '/login',
        '/logout',
        '/checkins/',
        '/api/v1/checkins',
    ];

    return !noCachePatterns.some((pattern) => url.includes(pattern));
}

/**
 * Get static assets that should be cached
 */
export function getStaticAssetsToCache(): string[] {
    return [
        '/',
        '/index.html',
        '/manifest.json',
        '/icon-192.png',
        '/icon-512.png',
    ];
}
