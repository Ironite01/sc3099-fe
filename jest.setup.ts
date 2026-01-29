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

// Mock sessionStorage
const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
});

// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
    writable: true,
    value: {
        register: jest.fn(),
        ready: Promise.resolve({
            unregister: jest.fn().mockResolvedValue(true),
        }),
        getRegistration: jest.fn(),
    },
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
});

// Mock caches API (for Service Worker tests)
Object.defineProperty(global, 'caches', {
    writable: true,
    value: {
        open: jest.fn().mockResolvedValue({
            match: jest.fn(),
            put: jest.fn(),
            addAll: jest.fn().mockResolvedValue(undefined),
        }),
        keys: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue(true),
    },
});

// Mock Request and Response for caching tests
global.Request = class Request {
    url: string;
    constructor(input: string) {
        this.url = input;
    }
} as unknown as typeof Request;

global.Response = class Response {
    ok: boolean;
    status: number;
    body: unknown;
    constructor(body?: unknown, init?: { status?: number }) {
        this.body = body;
        this.status = init?.status || 200;
        this.ok = this.status >= 200 && this.status < 300;
    }
    clone() {
        return new Response(this.body, { status: this.status });
    }
} as unknown as typeof Response;

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

// Mock atob for JWT decoding tests
global.atob = (str: string) => {
    return Buffer.from(str, 'base64').toString('binary');
};

// Mock btoa for JWT encoding in tests
global.btoa = (str: string) => {
    return Buffer.from(str, 'binary').toString('base64');
};

// Mock IDBKeyRange for IndexedDB tests
global.IDBKeyRange = {
    only: jest.fn((value) => ({ type: 'only', value })),
    upperBound: jest.fn((value) => ({ type: 'upperBound', value })),
    lowerBound: jest.fn((value) => ({ type: 'lowerBound', value })),
    bound: jest.fn((lower, upper) => ({ type: 'bound', lower, upper })),
} as unknown as typeof IDBKeyRange;

// Reset mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
});
