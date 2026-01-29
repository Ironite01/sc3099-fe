import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
        getUserMedia: jest.fn(),
        enumerateDevices: jest.fn(),
    },
});

// Mock navigator.geolocation
Object.defineProperty(navigator, 'geolocation', {
    writable: true,
    value: {
        getCurrentPosition: jest.fn(),
        watchPosition: jest.fn(),
        clearWatch: jest.fn(),
    },
});

// Mock navigator.permissions
Object.defineProperty(navigator, 'permissions', {
    writable: true,
    value: {
        query: jest.fn(),
    },
});

// Mock crypto.subtle for device fingerprinting tests
const mockCrypto = {
    subtle: {
        digest: jest.fn(),
        generateKey: jest.fn(),
        exportKey: jest.fn(),
        sign: jest.fn(),
    },
    getRandomValues: jest.fn((arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
    }),
};

Object.defineProperty(global, 'crypto', {
    value: mockCrypto,
});

// Mock TextEncoder
global.TextEncoder = class TextEncoder {
    encode(str: string): Uint8Array {
        const arr = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            arr[i] = str.charCodeAt(i);
        }
        return arr;
    }
};

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

// Mock HTMLMediaElement.play (not implemented in jsdom)
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: jest.fn().mockResolvedValue(undefined),
});

// Reset mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
});
