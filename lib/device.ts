/**
 * Device Fingerprinting and Key Management for SAIV Frontend
 *
 * Provides functions for:
 * - Generating device fingerprints
 * - ECDSA key pair generation (Web Crypto API)
 * - Key storage and rotation
 * - Device information collection
 */

export interface DeviceInfo {
    fingerprint: string;
    userAgent: string;
    platform: string;
    language: string;
    screenResolution: string;
    timezone: string;
    timestamp: number;
}

export interface KeyPair {
    publicKey: string; // PEM format
    privateKey: CryptoKey;
    createdAt: number;
}

/**
 * Generate a device fingerprint based on browser characteristics
 * @returns Device fingerprint string
 */
export async function generateDeviceFingerprint(): Promise<string> {
    const components = [
        navigator.userAgent,
        navigator.language,
        navigator.platform,
        screen.colorDepth,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        (navigator as unknown as { deviceMemory?: number }).deviceMemory || 'unknown',
    ];

    const fingerprintString = components.join('|');

    // Hash the fingerprint using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
}

/**
 * Get detailed device information
 * @returns DeviceInfo object
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
    const fingerprint = await generateDeviceFingerprint();

    return {
        fingerprint,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: Date.now(),
    };
}

/**
 * Generate ECDSA key pair using Web Crypto API
 * @returns Promise<CryptoKeyPair> - Generated key pair
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
    try {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'ECDSA',
                namedCurve: 'P-256', // secp256r1
            },
            true, // extractable
            ['sign', 'verify']
        );

        return keyPair;
    } catch (error) {
        console.error('Key generation error:', error);
        throw new Error('Failed to generate key pair');
    }
}

/**
 * Export public key to PEM format
 * @param publicKey - CryptoKey public key
 * @returns Promise<string> - PEM formatted public key
 */
export async function exportPublicKeyToPEM(publicKey: CryptoKey): Promise<string> {
    try {
        const exported = await crypto.subtle.exportKey('spki', publicKey);
        const exportedAsString = arrayBufferToBase64(exported);
        const pemExported = `-----BEGIN PUBLIC KEY-----\n${exportedAsString}\n-----END PUBLIC KEY-----`;
        return pemExported;
    } catch (error) {
        console.error('Public key export error:', error);
        throw new Error('Failed to export public key');
    }
}

/**
 * Convert ArrayBuffer to Base64 string
 * @param buffer - ArrayBuffer
 * @returns Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Store key pair in IndexedDB (using localforage)
 * @param keyPair - KeyPair to store
 */
export async function storeKeyPair(keyPair: KeyPair): Promise<void> {
    try {
        // Store in localStorage (for simplicity, in production use IndexedDB)
        localStorage.setItem('device_public_key', keyPair.publicKey);
        localStorage.setItem('device_key_created_at', keyPair.createdAt.toString());
        // Note: We cannot store CryptoKey directly in localStorage
        // In a real implementation, use IndexedDB or secure storage
    } catch (error) {
        console.error('Key storage error:', error);
        throw new Error('Failed to store key pair');
    }
}

/**
 * Retrieve stored key pair
 * @returns Promise<KeyPair | null> - Stored key pair or null
 */
export async function getStoredKeyPair(): Promise<{ publicKey: string; createdAt: number } | null> {
    try {
        const publicKey = localStorage.getItem('device_public_key');
        const createdAt = localStorage.getItem('device_key_created_at');

        if (!publicKey || !createdAt) {
            return null;
        }

        return {
            publicKey,
            createdAt: parseInt(createdAt, 10),
        };
    } catch (error) {
        console.error('Key retrieval error:', error);
        return null;
    }
}

/**
 * Generate and store a new key pair
 * @returns Promise<string> - PEM formatted public key
 */
export async function generateAndStoreKeyPair(): Promise<string> {
    const keyPair = await generateKeyPair();
    const publicKeyPEM = await exportPublicKeyToPEM(keyPair.publicKey);

    await storeKeyPair({
        publicKey: publicKeyPEM,
        privateKey: keyPair.privateKey,
        createdAt: Date.now(),
    });

    return publicKeyPEM;
}

/**
 * Get or generate device public key
 * Rotates key if it's older than 30 days
 * @returns Promise<string> - PEM formatted public key
 */
export async function getOrGenerateDeviceKey(): Promise<string> {
    const stored = await getStoredKeyPair();

    // Check if key exists and is not too old (30 days)
    const KEY_ROTATION_PERIOD = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

    if (stored && (Date.now() - stored.createdAt) < KEY_ROTATION_PERIOD) {
        return stored.publicKey;
    }

    // Generate new key pair
    return await generateAndStoreKeyPair();
}

/**
 * Clear stored device keys
 */
export function clearStoredKeys(): void {
    localStorage.removeItem('device_public_key');
    localStorage.removeItem('device_key_created_at');
}

/**
 * Get device fingerprint from storage or generate new one
 * @returns Promise<string> - Device fingerprint
 */
export async function getOrGenerateFingerprint(): Promise<string> {
    let fingerprint = localStorage.getItem('device_fingerprint');

    if (!fingerprint) {
        fingerprint = await generateDeviceFingerprint();
        localStorage.setItem('device_fingerprint', fingerprint);
    }

    return fingerprint;
}

/**
 * Sign data with private key (for future use)
 * @param privateKey - CryptoKey private key
 * @param data - Data to sign
 * @returns Promise<ArrayBuffer> - Signature
 */
export async function signData(privateKey: CryptoKey, data: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const signature = await crypto.subtle.sign(
        {
            name: 'ECDSA',
            hash: { name: 'SHA-256' },
        },
        privateKey,
        dataBuffer
    );

    return signature;
}
