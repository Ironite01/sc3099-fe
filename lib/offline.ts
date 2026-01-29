/**
 * Offline storage utilities using IndexedDB
 * Provides structured data storage for offline-first functionality
 */

const DB_NAME = 'saiv-offline-db';
const DB_VERSION = 1;

export interface OfflineCheckIn {
    id: string;
    sessionId: string;
    timestamp: number;
    latitude: number;
    longitude: number;
    imageBase64: string;
    deviceFingerprint: string;
    synced: boolean;
}

export interface OfflineSession {
    id: string;
    courseName: string;
    sessionType: string;
    startTime: string;
    endTime: string;
    locationLat: number;
    locationLon: number;
    locationRadius: number;
    cachedAt: number;
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
    return 'indexedDB' in window;
}

/**
 * Open the offline database
 */
export function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!isIndexedDBAvailable()) {
            reject(new Error('IndexedDB is not supported in this browser'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Failed to open database'));
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains('pendingCheckIns')) {
                const checkInStore = db.createObjectStore('pendingCheckIns', { keyPath: 'id' });
                checkInStore.createIndex('sessionId', 'sessionId', { unique: false });
                checkInStore.createIndex('synced', 'synced', { unique: false });
            }

            if (!db.objectStoreNames.contains('cachedSessions')) {
                const sessionStore = db.createObjectStore('cachedSessions', { keyPath: 'id' });
                sessionStore.createIndex('cachedAt', 'cachedAt', { unique: false });
            }

            if (!db.objectStoreNames.contains('userProfile')) {
                db.createObjectStore('userProfile', { keyPath: 'id' });
            }
        };
    });
}

/**
 * Close the database connection
 */
export function closeDatabase(db: IDBDatabase): void {
    db.close();
}

/**
 * Store a pending check-in for later sync
 */
export async function storePendingCheckIn(checkIn: OfflineCheckIn): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pendingCheckIns'], 'readwrite');
        const store = transaction.objectStore('pendingCheckIns');

        const request = store.put(checkIn);

        request.onsuccess = () => {
            closeDatabase(db);
            resolve();
        };

        request.onerror = () => {
            closeDatabase(db);
            reject(new Error('Failed to store pending check-in'));
        };
    });
}

/**
 * Get all pending (unsynced) check-ins
 */
export async function getPendingCheckIns(): Promise<OfflineCheckIn[]> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pendingCheckIns'], 'readonly');
        const store = transaction.objectStore('pendingCheckIns');
        const index = store.index('synced');
        const request = index.getAll(IDBKeyRange.only(false));

        request.onsuccess = () => {
            closeDatabase(db);
            resolve(request.result);
        };

        request.onerror = () => {
            closeDatabase(db);
            reject(new Error('Failed to get pending check-ins'));
        };
    });
}

/**
 * Mark a check-in as synced
 */
export async function markCheckInSynced(id: string): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pendingCheckIns'], 'readwrite');
        const store = transaction.objectStore('pendingCheckIns');

        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const checkIn = getRequest.result;
            if (checkIn) {
                checkIn.synced = true;
                const putRequest = store.put(checkIn);

                putRequest.onsuccess = () => {
                    closeDatabase(db);
                    resolve();
                };

                putRequest.onerror = () => {
                    closeDatabase(db);
                    reject(new Error('Failed to mark check-in as synced'));
                };
            } else {
                closeDatabase(db);
                reject(new Error('Check-in not found'));
            }
        };

        getRequest.onerror = () => {
            closeDatabase(db);
            reject(new Error('Failed to get check-in'));
        };
    });
}

/**
 * Delete a synced check-in
 */
export async function deletePendingCheckIn(id: string): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pendingCheckIns'], 'readwrite');
        const store = transaction.objectStore('pendingCheckIns');

        const request = store.delete(id);

        request.onsuccess = () => {
            closeDatabase(db);
            resolve();
        };

        request.onerror = () => {
            closeDatabase(db);
            reject(new Error('Failed to delete check-in'));
        };
    });
}

/**
 * Cache sessions for offline access
 */
export async function cacheSession(session: OfflineSession): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['cachedSessions'], 'readwrite');
        const store = transaction.objectStore('cachedSessions');

        const sessionWithTimestamp = {
            ...session,
            cachedAt: Date.now(),
        };

        const request = store.put(sessionWithTimestamp);

        request.onsuccess = () => {
            closeDatabase(db);
            resolve();
        };

        request.onerror = () => {
            closeDatabase(db);
            reject(new Error('Failed to cache session'));
        };
    });
}

/**
 * Get cached sessions
 */
export async function getCachedSessions(): Promise<OfflineSession[]> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['cachedSessions'], 'readonly');
        const store = transaction.objectStore('cachedSessions');
        const request = store.getAll();

        request.onsuccess = () => {
            closeDatabase(db);
            resolve(request.result);
        };

        request.onerror = () => {
            closeDatabase(db);
            reject(new Error('Failed to get cached sessions'));
        };
    });
}

/**
 * Clear expired cached sessions (older than 24 hours)
 */
export async function clearExpiredSessions(): Promise<number> {
    const db = await openDatabase();
    const expiryTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['cachedSessions'], 'readwrite');
        const store = transaction.objectStore('cachedSessions');
        const index = store.index('cachedAt');
        const range = IDBKeyRange.upperBound(expiryTime);

        let deletedCount = 0;
        const request = index.openCursor(range);

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                cursor.delete();
                deletedCount++;
                cursor.continue();
            } else {
                closeDatabase(db);
                resolve(deletedCount);
            }
        };

        request.onerror = () => {
            closeDatabase(db);
            reject(new Error('Failed to clear expired sessions'));
        };
    });
}

/**
 * Store user profile for offline access
 */
export async function storeUserProfile(profile: Record<string, unknown>): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['userProfile'], 'readwrite');
        const store = transaction.objectStore('userProfile');

        const profileWithId = { id: 'currentUser', ...profile };
        const request = store.put(profileWithId);

        request.onsuccess = () => {
            closeDatabase(db);
            resolve();
        };

        request.onerror = () => {
            closeDatabase(db);
            reject(new Error('Failed to store user profile'));
        };
    });
}

/**
 * Get stored user profile
 */
export async function getUserProfile(): Promise<Record<string, unknown> | null> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['userProfile'], 'readonly');
        const store = transaction.objectStore('userProfile');
        const request = store.get('currentUser');

        request.onsuccess = () => {
            closeDatabase(db);
            resolve(request.result || null);
        };

        request.onerror = () => {
            closeDatabase(db);
            reject(new Error('Failed to get user profile'));
        };
    });
}

/**
 * Clear all offline data (for logout)
 */
export async function clearAllOfflineData(): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(
            ['pendingCheckIns', 'cachedSessions', 'userProfile'],
            'readwrite'
        );

        transaction.objectStore('pendingCheckIns').clear();
        transaction.objectStore('cachedSessions').clear();
        transaction.objectStore('userProfile').clear();

        transaction.oncomplete = () => {
            closeDatabase(db);
            resolve();
        };

        transaction.onerror = () => {
            closeDatabase(db);
            reject(new Error('Failed to clear offline data'));
        };
    });
}

/**
 * Check if we're online
 */
export function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * Add online/offline event listeners
 */
export function addConnectivityListeners(
    onOnline: () => void,
    onOffline: () => void
): () => void {
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Return cleanup function
    return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
    };
}
