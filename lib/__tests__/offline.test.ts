/**
 * Tests for Offline storage utilities (IndexedDB)
 * Covers PDF requirements: IndexedDB for structured offline data
 */

import {
    isIndexedDBAvailable,
    openDatabase,
    closeDatabase,
    storePendingCheckIn,
    getPendingCheckIns,
    markCheckInSynced,
    deletePendingCheckIn,
    cacheSession,
    getCachedSessions,
    clearExpiredSessions,
    storeUserProfile,
    getUserProfile,
    clearAllOfflineData,
    isOnline,
    addConnectivityListeners,
    OfflineCheckIn,
    OfflineSession,
} from '../offline';

describe('Offline Storage Utilities', () => {
    // Mock IndexedDB
    let mockDb: {
        close: jest.Mock;
        transaction: jest.Mock;
        objectStoreNames: { contains: jest.Mock };
        createObjectStore: jest.Mock;
    };
    let mockStore: {
        put: jest.Mock;
        get: jest.Mock;
        getAll: jest.Mock;
        delete: jest.Mock;
        clear: jest.Mock;
        index: jest.Mock;
        createIndex: jest.Mock;
    };
    let mockIndex: {
        getAll: jest.Mock;
        openCursor: jest.Mock;
    };
    let mockTransaction: {
        objectStore: jest.Mock;
        oncomplete: (() => void) | null;
        onerror: (() => void) | null;
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockIndex = {
            getAll: jest.fn(),
            openCursor: jest.fn(),
        };

        mockStore = {
            put: jest.fn(),
            get: jest.fn(),
            getAll: jest.fn(),
            delete: jest.fn(),
            clear: jest.fn(),
            index: jest.fn().mockReturnValue(mockIndex),
            createIndex: jest.fn(),
        };

        mockTransaction = {
            objectStore: jest.fn().mockReturnValue(mockStore),
            oncomplete: null,
            onerror: null,
        };

        mockDb = {
            close: jest.fn(),
            transaction: jest.fn().mockReturnValue(mockTransaction),
            objectStoreNames: {
                contains: jest.fn().mockReturnValue(true),
            },
            createObjectStore: jest.fn().mockReturnValue(mockStore),
        };

        // Mock indexedDB.open
        const mockOpenRequest = {
            onerror: null as (() => void) | null,
            onsuccess: null as (() => void) | null,
            onupgradeneeded: null as ((event: unknown) => void) | null,
            result: mockDb,
        };

        Object.defineProperty(window, 'indexedDB', {
            writable: true,
            value: {
                open: jest.fn().mockImplementation(() => {
                    setTimeout(() => {
                        if (mockOpenRequest.onsuccess) {
                            mockOpenRequest.onsuccess();
                        }
                    }, 0);
                    return mockOpenRequest;
                }),
            },
        });
    });

    describe('isIndexedDBAvailable', () => {
        it('should return true when IndexedDB is available', () => {
            expect(isIndexedDBAvailable()).toBe(true);
        });

        it('should check for indexedDB in window', () => {
            // Verify the check is performed correctly
            expect('indexedDB' in window).toBe(true);
            expect(isIndexedDBAvailable()).toBe(true);
        });
    });

    describe('openDatabase', () => {
        it('should open database successfully', async () => {
            const db = await openDatabase();

            expect(indexedDB.open).toHaveBeenCalledWith('saiv-offline-db', 1);
            expect(db).toBe(mockDb);
        });

        it('should use the correct database name and version', async () => {
            await openDatabase();

            expect(indexedDB.open).toHaveBeenCalledWith('saiv-offline-db', 1);
        });

        it('should handle database open error', async () => {
            const mockOpenRequest = {
                onerror: null as (() => void) | null,
                onsuccess: null as (() => void) | null,
                result: mockDb,
            };

            (indexedDB.open as jest.Mock).mockImplementationOnce(() => {
                setTimeout(() => {
                    if (mockOpenRequest.onerror) {
                        mockOpenRequest.onerror();
                    }
                }, 0);
                return mockOpenRequest;
            });

            await expect(openDatabase()).rejects.toThrow('Failed to open database');
        });

        it('should create object stores on upgrade', async () => {
            mockDb.objectStoreNames.contains.mockReturnValue(false);

            const mockOpenRequest = {
                onerror: null as (() => void) | null,
                onsuccess: null as (() => void) | null,
                onupgradeneeded: null as ((event: unknown) => void) | null,
                result: mockDb,
            };

            (indexedDB.open as jest.Mock).mockImplementationOnce(() => {
                setTimeout(() => {
                    if (mockOpenRequest.onupgradeneeded) {
                        mockOpenRequest.onupgradeneeded({
                            target: { result: mockDb },
                        });
                    }
                    if (mockOpenRequest.onsuccess) {
                        mockOpenRequest.onsuccess();
                    }
                }, 0);
                return mockOpenRequest;
            });

            await openDatabase();

            expect(mockDb.createObjectStore).toHaveBeenCalledWith('pendingCheckIns', {
                keyPath: 'id',
            });
            expect(mockDb.createObjectStore).toHaveBeenCalledWith('cachedSessions', {
                keyPath: 'id',
            });
            expect(mockDb.createObjectStore).toHaveBeenCalledWith('userProfile', {
                keyPath: 'id',
            });
        });
    });

    describe('closeDatabase', () => {
        it('should close database connection', () => {
            closeDatabase(mockDb as unknown as IDBDatabase);

            expect(mockDb.close).toHaveBeenCalled();
        });
    });

    describe('storePendingCheckIn', () => {
        const mockCheckIn: OfflineCheckIn = {
            id: 'checkin-1',
            sessionId: 'session-1',
            timestamp: Date.now(),
            latitude: 1.3521,
            longitude: 103.8198,
            imageBase64: 'base64data',
            deviceFingerprint: 'fingerprint',
            synced: false,
        };

        it('should store pending check-in successfully', async () => {
            mockStore.put.mockImplementation(() => {
                const request = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                };
                setTimeout(() => {
                    if (request.onsuccess) request.onsuccess();
                }, 0);
                return request;
            });

            await storePendingCheckIn(mockCheckIn);

            expect(mockStore.put).toHaveBeenCalledWith(mockCheckIn);
            expect(mockDb.close).toHaveBeenCalled();
        });

        it('should reject when storage fails', async () => {
            mockStore.put.mockImplementation(() => {
                const request = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                };
                setTimeout(() => {
                    if (request.onerror) request.onerror();
                }, 0);
                return request;
            });

            await expect(storePendingCheckIn(mockCheckIn)).rejects.toThrow(
                'Failed to store pending check-in'
            );
        });
    });

    describe('getPendingCheckIns', () => {
        it('should return pending (unsynced) check-ins', async () => {
            const mockCheckIns: OfflineCheckIn[] = [
                {
                    id: 'checkin-1',
                    sessionId: 'session-1',
                    timestamp: Date.now(),
                    latitude: 1.3521,
                    longitude: 103.8198,
                    imageBase64: 'base64data',
                    deviceFingerprint: 'fingerprint',
                    synced: false,
                },
            ];

            mockIndex.getAll.mockImplementation(() => {
                const request = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                    result: mockCheckIns,
                };
                setTimeout(() => {
                    if (request.onsuccess) request.onsuccess();
                }, 0);
                return request;
            });

            const result = await getPendingCheckIns();

            expect(mockStore.index).toHaveBeenCalledWith('synced');
            expect(result).toEqual(mockCheckIns);
        });
    });

    describe('markCheckInSynced', () => {
        it('should mark check-in as synced', async () => {
            const mockCheckIn = {
                id: 'checkin-1',
                synced: false,
            };

            mockStore.get.mockImplementation(() => {
                const request = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                    result: mockCheckIn,
                };
                setTimeout(() => {
                    if (request.onsuccess) request.onsuccess();
                }, 0);
                return request;
            });

            mockStore.put.mockImplementation(() => {
                const request = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                };
                setTimeout(() => {
                    if (request.onsuccess) request.onsuccess();
                }, 0);
                return request;
            });

            await markCheckInSynced('checkin-1');

            expect(mockStore.get).toHaveBeenCalledWith('checkin-1');
            expect(mockStore.put).toHaveBeenCalledWith({ id: 'checkin-1', synced: true });
        });

        it('should reject when check-in not found', async () => {
            mockStore.get.mockImplementation(() => {
                const request = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                    result: undefined,
                };
                setTimeout(() => {
                    if (request.onsuccess) request.onsuccess();
                }, 0);
                return request;
            });

            await expect(markCheckInSynced('nonexistent')).rejects.toThrow('Check-in not found');
        });
    });

    describe('deletePendingCheckIn', () => {
        it('should delete check-in successfully', async () => {
            mockStore.delete.mockImplementation(() => {
                const request = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                };
                setTimeout(() => {
                    if (request.onsuccess) request.onsuccess();
                }, 0);
                return request;
            });

            await deletePendingCheckIn('checkin-1');

            expect(mockStore.delete).toHaveBeenCalledWith('checkin-1');
        });
    });

    describe('cacheSession', () => {
        const mockSession: OfflineSession = {
            id: 'session-1',
            courseName: 'CS101',
            sessionType: 'lecture',
            startTime: '2024-01-15T10:00:00Z',
            endTime: '2024-01-15T11:00:00Z',
            locationLat: 1.3521,
            locationLon: 103.8198,
            locationRadius: 100,
            cachedAt: 0,
        };

        it('should cache session with timestamp', async () => {
            mockStore.put.mockImplementation(() => {
                const request = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                };
                setTimeout(() => {
                    if (request.onsuccess) request.onsuccess();
                }, 0);
                return request;
            });

            await cacheSession(mockSession);

            expect(mockStore.put).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'session-1',
                    cachedAt: expect.any(Number),
                })
            );
        });
    });

    describe('getCachedSessions', () => {
        it('should return all cached sessions', async () => {
            const mockSessions: OfflineSession[] = [
                {
                    id: 'session-1',
                    courseName: 'CS101',
                    sessionType: 'lecture',
                    startTime: '2024-01-15T10:00:00Z',
                    endTime: '2024-01-15T11:00:00Z',
                    locationLat: 1.3521,
                    locationLon: 103.8198,
                    locationRadius: 100,
                    cachedAt: Date.now(),
                },
            ];

            mockStore.getAll.mockImplementation(() => {
                const request = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                    result: mockSessions,
                };
                setTimeout(() => {
                    if (request.onsuccess) request.onsuccess();
                }, 0);
                return request;
            });

            const result = await getCachedSessions();

            expect(result).toEqual(mockSessions);
        });
    });

    describe('clearExpiredSessions', () => {
        it('should call index on cachedAt for expired sessions', async () => {
            // Simulate cursor returning null immediately (no expired sessions)
            mockIndex.openCursor.mockImplementation(() => {
                const request = {
                    onsuccess: null as ((event: unknown) => void) | null,
                    onerror: null as (() => void) | null,
                };
                setTimeout(() => {
                    if (request.onsuccess) {
                        // No expired sessions - cursor returns null
                        request.onsuccess({ target: { result: null } });
                    }
                }, 0);
                return request;
            });

            const deletedCount = await clearExpiredSessions();

            expect(mockStore.index).toHaveBeenCalledWith('cachedAt');
            expect(deletedCount).toBe(0);
        });

        it('should use IDBKeyRange.upperBound for expiry time', async () => {
            mockIndex.openCursor.mockImplementation(() => {
                const request = {
                    onsuccess: null as ((event: unknown) => void) | null,
                    onerror: null as (() => void) | null,
                };
                setTimeout(() => {
                    if (request.onsuccess) {
                        request.onsuccess({ target: { result: null } });
                    }
                }, 0);
                return request;
            });

            await clearExpiredSessions();

            // Verify IDBKeyRange.upperBound was called for 24 hours ago
            expect(global.IDBKeyRange.upperBound).toHaveBeenCalled();
        });
    });

    describe('storeUserProfile', () => {
        it('should store user profile with id', async () => {
            mockStore.put.mockImplementation(() => {
                const request = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                };
                setTimeout(() => {
                    if (request.onsuccess) request.onsuccess();
                }, 0);
                return request;
            });

            const profile = { email: 'test@example.com', name: 'Test User' };
            await storeUserProfile(profile);

            expect(mockStore.put).toHaveBeenCalledWith({
                id: 'currentUser',
                email: 'test@example.com',
                name: 'Test User',
            });
        });
    });

    describe('getUserProfile', () => {
        it('should return stored user profile', async () => {
            const mockProfile = {
                id: 'currentUser',
                email: 'test@example.com',
            };

            mockStore.get.mockImplementation(() => {
                const request = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                    result: mockProfile,
                };
                setTimeout(() => {
                    if (request.onsuccess) request.onsuccess();
                }, 0);
                return request;
            });

            const result = await getUserProfile();

            expect(mockStore.get).toHaveBeenCalledWith('currentUser');
            expect(result).toEqual(mockProfile);
        });

        it('should return null when no profile stored', async () => {
            mockStore.get.mockImplementation(() => {
                const request = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                    result: undefined,
                };
                setTimeout(() => {
                    if (request.onsuccess) request.onsuccess();
                }, 0);
                return request;
            });

            const result = await getUserProfile();

            expect(result).toBeNull();
        });
    });

    describe('clearAllOfflineData', () => {
        it('should clear all object stores', async () => {
            mockTransaction.oncomplete = null;

            mockDb.transaction.mockImplementation(() => {
                setTimeout(() => {
                    if (mockTransaction.oncomplete) {
                        mockTransaction.oncomplete();
                    }
                }, 0);
                return mockTransaction;
            });

            await clearAllOfflineData();

            expect(mockDb.transaction).toHaveBeenCalledWith(
                ['pendingCheckIns', 'cachedSessions', 'userProfile'],
                'readwrite'
            );
            expect(mockStore.clear).toHaveBeenCalledTimes(3);
        });
    });

    describe('isOnline', () => {
        it('should return navigator.onLine value', () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true,
            });

            expect(isOnline()).toBe(true);

            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false,
            });

            expect(isOnline()).toBe(false);
        });
    });

    describe('addConnectivityListeners', () => {
        it('should add online and offline event listeners', () => {
            const onOnline = jest.fn();
            const onOffline = jest.fn();
            const addEventSpy = jest.spyOn(window, 'addEventListener');

            addConnectivityListeners(onOnline, onOffline);

            expect(addEventSpy).toHaveBeenCalledWith('online', onOnline);
            expect(addEventSpy).toHaveBeenCalledWith('offline', onOffline);
        });

        it('should return cleanup function', () => {
            const onOnline = jest.fn();
            const onOffline = jest.fn();
            const removeEventSpy = jest.spyOn(window, 'removeEventListener');

            const cleanup = addConnectivityListeners(onOnline, onOffline);
            cleanup();

            expect(removeEventSpy).toHaveBeenCalledWith('online', onOnline);
            expect(removeEventSpy).toHaveBeenCalledWith('offline', onOffline);
        });
    });
});
