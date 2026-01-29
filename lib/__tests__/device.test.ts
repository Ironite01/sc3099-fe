/**
 * Tests for Device fingerprinting and key management utilities
 */

import {
    generateDeviceFingerprint,
    getDeviceInfo,
    generateKeyPair,
    exportPublicKeyToPEM,
    storeKeyPair,
    getStoredKeyPair,
    generateAndStoreKeyPair,
    getOrGenerateDeviceKey,
    clearStoredKeys,
    getOrGenerateFingerprint,
    signData,
} from '../device';

describe('Device Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (localStorage.getItem as jest.Mock).mockReturnValue(null);
    });

    describe('generateDeviceFingerprint', () => {
        it('should generate a SHA-256 hex hash fingerprint', async () => {
            // Mock crypto.subtle.digest to return a consistent hash
            const mockHashBuffer = new Uint8Array([
                0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
                0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
                0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
                0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
            ]).buffer;

            (crypto.subtle.digest as jest.Mock).mockResolvedValueOnce(mockHashBuffer);

            const fingerprint = await generateDeviceFingerprint();

            expect(fingerprint).toBe('123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0');
            expect(crypto.subtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
        });

        it('should use browser characteristics for fingerprint', async () => {
            const mockHashBuffer = new Uint8Array(32).buffer;
            (crypto.subtle.digest as jest.Mock).mockResolvedValueOnce(mockHashBuffer);

            await generateDeviceFingerprint();

            // Verify that digest was called (meaning browser characteristics were collected)
            expect(crypto.subtle.digest).toHaveBeenCalled();
        });
    });

    describe('getDeviceInfo', () => {
        it('should return device information object', async () => {
            const mockHashBuffer = new Uint8Array(32).buffer;
            (crypto.subtle.digest as jest.Mock).mockResolvedValueOnce(mockHashBuffer);

            const deviceInfo = await getDeviceInfo();

            expect(deviceInfo).toHaveProperty('fingerprint');
            expect(deviceInfo).toHaveProperty('userAgent');
            expect(deviceInfo).toHaveProperty('platform');
            expect(deviceInfo).toHaveProperty('language');
            expect(deviceInfo).toHaveProperty('screenResolution');
            expect(deviceInfo).toHaveProperty('timezone');
            expect(deviceInfo).toHaveProperty('timestamp');
            expect(typeof deviceInfo.timestamp).toBe('number');
        });
    });

    describe('generateKeyPair', () => {
        it('should generate ECDSA key pair', async () => {
            const mockKeyPair = {
                publicKey: { type: 'public' },
                privateKey: { type: 'private' },
            };

            (crypto.subtle.generateKey as jest.Mock).mockResolvedValueOnce(mockKeyPair);

            const keyPair = await generateKeyPair();

            expect(crypto.subtle.generateKey).toHaveBeenCalledWith(
                {
                    name: 'ECDSA',
                    namedCurve: 'P-256',
                },
                true,
                ['sign', 'verify']
            );
            expect(keyPair).toEqual(mockKeyPair);
        });

        it('should throw error when key generation fails', async () => {
            (crypto.subtle.generateKey as jest.Mock).mockRejectedValueOnce(
                new Error('Key generation failed')
            );

            await expect(generateKeyPair()).rejects.toThrow('Failed to generate key pair');
        });
    });

    describe('exportPublicKeyToPEM', () => {
        it('should export public key in PEM format', async () => {
            const mockSpkiBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
            (crypto.subtle.exportKey as jest.Mock).mockResolvedValueOnce(mockSpkiBuffer);

            const mockPublicKey = {} as CryptoKey;
            const pem = await exportPublicKeyToPEM(mockPublicKey);

            expect(crypto.subtle.exportKey).toHaveBeenCalledWith('spki', mockPublicKey);
            expect(pem).toContain('-----BEGIN PUBLIC KEY-----');
            expect(pem).toContain('-----END PUBLIC KEY-----');
        });

        it('should throw error when export fails', async () => {
            (crypto.subtle.exportKey as jest.Mock).mockRejectedValueOnce(
                new Error('Export failed')
            );

            const mockPublicKey = {} as CryptoKey;
            await expect(exportPublicKeyToPEM(mockPublicKey)).rejects.toThrow(
                'Failed to export public key'
            );
        });
    });

    describe('storeKeyPair', () => {
        it('should store public key and creation time in localStorage', async () => {
            const keyPair = {
                publicKey: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
                privateKey: {} as CryptoKey,
                createdAt: 1705312200000,
            };

            await storeKeyPair(keyPair);

            expect(localStorage.setItem).toHaveBeenCalledWith('device_public_key', keyPair.publicKey);
            expect(localStorage.setItem).toHaveBeenCalledWith('device_key_created_at', '1705312200000');
        });

        it('should throw error when storage fails', async () => {
            (localStorage.setItem as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Storage full');
            });

            const keyPair = {
                publicKey: 'test',
                privateKey: {} as CryptoKey,
                createdAt: Date.now(),
            };

            await expect(storeKeyPair(keyPair)).rejects.toThrow('Failed to store key pair');
        });
    });

    describe('getStoredKeyPair', () => {
        it('should return stored key pair', async () => {
            (localStorage.getItem as jest.Mock)
                .mockReturnValueOnce('-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----')
                .mockReturnValueOnce('1705312200000');

            const result = await getStoredKeyPair();

            expect(result).toEqual({
                publicKey: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
                createdAt: 1705312200000,
            });
        });

        it('should return null when no key pair is stored', async () => {
            (localStorage.getItem as jest.Mock).mockReturnValue(null);

            const result = await getStoredKeyPair();

            expect(result).toBeNull();
        });

        it('should return null when only public key is stored', async () => {
            (localStorage.getItem as jest.Mock)
                .mockReturnValueOnce('-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----')
                .mockReturnValueOnce(null);

            const result = await getStoredKeyPair();

            expect(result).toBeNull();
        });

        it('should return null on error', async () => {
            (localStorage.getItem as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Storage error');
            });

            const result = await getStoredKeyPair();

            expect(result).toBeNull();
        });
    });

    describe('generateAndStoreKeyPair', () => {
        it('should generate, export, and store key pair', async () => {
            const mockKeyPair = {
                publicKey: { type: 'public' },
                privateKey: { type: 'private' },
            };
            const mockSpkiBuffer = new Uint8Array([1, 2, 3]).buffer;

            (crypto.subtle.generateKey as jest.Mock).mockResolvedValueOnce(mockKeyPair);
            (crypto.subtle.exportKey as jest.Mock).mockResolvedValueOnce(mockSpkiBuffer);

            const publicKeyPEM = await generateAndStoreKeyPair();

            expect(crypto.subtle.generateKey).toHaveBeenCalled();
            expect(crypto.subtle.exportKey).toHaveBeenCalled();
            expect(localStorage.setItem).toHaveBeenCalledWith('device_public_key', expect.any(String));
            expect(publicKeyPEM).toContain('-----BEGIN PUBLIC KEY-----');
        });
    });

    describe('getOrGenerateDeviceKey', () => {
        it('should return stored key if valid and not expired', async () => {
            const storedKey = '-----BEGIN PUBLIC KEY-----\nstored\n-----END PUBLIC KEY-----';
            const recentTimestamp = Date.now() - 1000 * 60 * 60 * 24; // 1 day ago

            (localStorage.getItem as jest.Mock)
                .mockReturnValueOnce(storedKey)
                .mockReturnValueOnce(recentTimestamp.toString());

            const result = await getOrGenerateDeviceKey();

            expect(result).toBe(storedKey);
            expect(crypto.subtle.generateKey).not.toHaveBeenCalled();
        });

        it('should generate new key if stored key is expired (>30 days)', async () => {
            const storedKey = '-----BEGIN PUBLIC KEY-----\nold\n-----END PUBLIC KEY-----';
            const oldTimestamp = Date.now() - 1000 * 60 * 60 * 24 * 31; // 31 days ago

            (localStorage.getItem as jest.Mock)
                .mockReturnValueOnce(storedKey)
                .mockReturnValueOnce(oldTimestamp.toString());

            const mockKeyPair = {
                publicKey: { type: 'public' },
                privateKey: { type: 'private' },
            };
            const mockSpkiBuffer = new Uint8Array([1, 2, 3]).buffer;

            (crypto.subtle.generateKey as jest.Mock).mockResolvedValueOnce(mockKeyPair);
            (crypto.subtle.exportKey as jest.Mock).mockResolvedValueOnce(mockSpkiBuffer);

            const result = await getOrGenerateDeviceKey();

            expect(crypto.subtle.generateKey).toHaveBeenCalled();
            expect(result).toContain('-----BEGIN PUBLIC KEY-----');
        });

        it('should generate new key if no key is stored', async () => {
            (localStorage.getItem as jest.Mock).mockReturnValue(null);

            const mockKeyPair = {
                publicKey: { type: 'public' },
                privateKey: { type: 'private' },
            };
            const mockSpkiBuffer = new Uint8Array([1, 2, 3]).buffer;

            (crypto.subtle.generateKey as jest.Mock).mockResolvedValueOnce(mockKeyPair);
            (crypto.subtle.exportKey as jest.Mock).mockResolvedValueOnce(mockSpkiBuffer);

            const result = await getOrGenerateDeviceKey();

            expect(crypto.subtle.generateKey).toHaveBeenCalled();
            expect(result).toContain('-----BEGIN PUBLIC KEY-----');
        });
    });

    describe('clearStoredKeys', () => {
        it('should remove keys from localStorage', () => {
            clearStoredKeys();

            expect(localStorage.removeItem).toHaveBeenCalledWith('device_public_key');
            expect(localStorage.removeItem).toHaveBeenCalledWith('device_key_created_at');
        });
    });

    describe('getOrGenerateFingerprint', () => {
        it('should return stored fingerprint if available', async () => {
            (localStorage.getItem as jest.Mock).mockReturnValueOnce('stored-fingerprint');

            const result = await getOrGenerateFingerprint();

            expect(result).toBe('stored-fingerprint');
            expect(crypto.subtle.digest).not.toHaveBeenCalled();
        });

        it('should generate and store new fingerprint if not available', async () => {
            (localStorage.getItem as jest.Mock).mockReturnValueOnce(null);

            const mockHashBuffer = new Uint8Array(32).buffer;
            (crypto.subtle.digest as jest.Mock).mockResolvedValueOnce(mockHashBuffer);

            const result = await getOrGenerateFingerprint();

            expect(crypto.subtle.digest).toHaveBeenCalled();
            expect(localStorage.setItem).toHaveBeenCalledWith('device_fingerprint', expect.any(String));
            expect(result).toBeDefined();
        });
    });

    describe('signData', () => {
        it('should sign data with private key', async () => {
            const mockSignature = new ArrayBuffer(64);
            (crypto.subtle.sign as jest.Mock).mockResolvedValueOnce(mockSignature);

            const mockPrivateKey = {} as CryptoKey;
            const result = await signData(mockPrivateKey, 'test data');

            expect(crypto.subtle.sign).toHaveBeenCalledWith(
                {
                    name: 'ECDSA',
                    hash: { name: 'SHA-256' },
                },
                mockPrivateKey,
                expect.any(Uint8Array)
            );
            expect(result).toBe(mockSignature);
        });
    });
});
