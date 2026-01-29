/**
 * Tests for Web App Manifest
 * Covers PDF requirements (Page 2): Web App Manifest - JSON file defining app metadata
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Web App Manifest', () => {
    let manifest: Record<string, unknown>;

    beforeAll(() => {
        // Read the actual manifest.json file
        const manifestPath = path.join(__dirname, '../../public/manifest.json');
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
        manifest = JSON.parse(manifestContent);
    });

    describe('Required Fields', () => {
        it('should have a name', () => {
            expect(manifest.name).toBeDefined();
            expect(typeof manifest.name).toBe('string');
            expect((manifest.name as string).length).toBeGreaterThan(0);
        });

        it('should have a short_name', () => {
            expect(manifest.short_name).toBeDefined();
            expect(typeof manifest.short_name).toBe('string');
            expect((manifest.short_name as string).length).toBeLessThanOrEqual(12);
        });

        it('should have a start_url', () => {
            expect(manifest.start_url).toBeDefined();
            expect(manifest.start_url).toBe('/');
        });

        it('should have display mode set to standalone', () => {
            expect(manifest.display).toBe('standalone');
        });
    });

    describe('Icons', () => {
        it('should have icons array', () => {
            expect(manifest.icons).toBeDefined();
            expect(Array.isArray(manifest.icons)).toBe(true);
        });

        it('should have at least one 192x192 icon', () => {
            const icons = manifest.icons as Array<{ sizes: string; src: string; type: string }>;
            const icon192 = icons.find((icon) => icon.sizes === '192x192');

            expect(icon192).toBeDefined();
            expect(icon192?.src).toBeDefined();
            expect(icon192?.type).toBe('image/png');
        });

        it('should have at least one 512x512 icon', () => {
            const icons = manifest.icons as Array<{ sizes: string; src: string; type: string }>;
            const icon512 = icons.find((icon) => icon.sizes === '512x512');

            expect(icon512).toBeDefined();
            expect(icon512?.src).toBeDefined();
            expect(icon512?.type).toBe('image/png');
        });

        it('icons should have valid purposes', () => {
            const icons = manifest.icons as Array<{ purpose?: string }>;
            const validPurposes = ['any', 'maskable', 'any maskable', 'maskable any'];

            icons.forEach((icon) => {
                if (icon.purpose) {
                    expect(validPurposes).toContain(icon.purpose);
                }
            });
        });
    });

    describe('Theme and Colors', () => {
        it('should have background_color', () => {
            expect(manifest.background_color).toBeDefined();
            expect(typeof manifest.background_color).toBe('string');
            // Should be a valid hex color
            expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
        });

        it('should have theme_color', () => {
            expect(manifest.theme_color).toBeDefined();
            expect(typeof manifest.theme_color).toBe('string');
            // Should be a valid hex color
            expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
        });
    });

    describe('Optional but Recommended Fields', () => {
        it('should have a description', () => {
            expect(manifest.description).toBeDefined();
            expect(typeof manifest.description).toBe('string');
        });

        it('should have orientation set to portrait', () => {
            expect(manifest.orientation).toBe('portrait');
        });
    });

    describe('PWA Installability Criteria', () => {
        it('should meet minimum installability requirements', () => {
            // Chrome PWA installability requirements
            expect(manifest.name).toBeDefined();
            expect(manifest.icons).toBeDefined();
            expect(manifest.start_url).toBeDefined();
            expect(manifest.display).toBeDefined();
            expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);
        });

        it('should have icons with maskable purpose for adaptive icons', () => {
            const icons = manifest.icons as Array<{ purpose?: string }>;
            const hasMaskable = icons.some(
                (icon) => icon.purpose && icon.purpose.includes('maskable')
            );

            expect(hasMaskable).toBe(true);
        });
    });

    describe('SAIV-specific Requirements', () => {
        it('should be named appropriately for attendance system', () => {
            const name = manifest.name as string;
            const shortName = manifest.short_name as string;

            // Should reference SAIV or attendance
            expect(
                name.toLowerCase().includes('saiv') ||
                name.toLowerCase().includes('attendance') ||
                name.toLowerCase().includes('secure')
            ).toBe(true);

            expect(shortName.toUpperCase()).toBe('SAIV');
        });

        it('should have description mentioning check-in or attendance', () => {
            const description = (manifest.description as string).toLowerCase();

            expect(
                description.includes('check-in') ||
                description.includes('attendance') ||
                description.includes('liveness')
            ).toBe(true);
        });
    });
});

describe('Manifest Validation Utilities', () => {
    /**
     * Validate that a manifest object meets PWA requirements
     */
    function validateManifest(manifest: Record<string, unknown>): {
        valid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        if (!manifest.name) {
            errors.push('Missing required field: name');
        }

        if (!manifest.short_name) {
            errors.push('Missing required field: short_name');
        }

        if (!manifest.start_url) {
            errors.push('Missing required field: start_url');
        }

        if (!manifest.display) {
            errors.push('Missing required field: display');
        } else if (!['standalone', 'fullscreen', 'minimal-ui', 'browser'].includes(manifest.display as string)) {
            errors.push('Invalid display mode');
        }

        if (!manifest.icons || !Array.isArray(manifest.icons) || manifest.icons.length === 0) {
            errors.push('Missing or empty icons array');
        } else {
            const icons = manifest.icons as Array<{ sizes: string }>;
            const has192 = icons.some((icon) => icon.sizes === '192x192');
            const has512 = icons.some((icon) => icon.sizes === '512x512');

            if (!has192) {
                errors.push('Missing 192x192 icon');
            }
            if (!has512) {
                errors.push('Missing 512x512 icon');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    it('should validate a correct manifest', () => {
        const validManifest = {
            name: 'Test App',
            short_name: 'Test',
            start_url: '/',
            display: 'standalone',
            icons: [
                { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            ],
        };

        const result = validateManifest(validManifest);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should detect missing name', () => {
        const manifest = {
            short_name: 'Test',
            start_url: '/',
            display: 'standalone',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
        };

        const result = validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: name');
    });

    it('should detect invalid display mode', () => {
        const manifest = {
            name: 'Test',
            short_name: 'Test',
            start_url: '/',
            display: 'invalid-mode',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
        };

        const result = validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid display mode');
    });

    it('should detect missing icons', () => {
        const manifest = {
            name: 'Test',
            short_name: 'Test',
            start_url: '/',
            display: 'standalone',
        };

        const result = validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing or empty icons array');
    });

    it('should detect missing 512x512 icon', () => {
        const manifest = {
            name: 'Test',
            short_name: 'Test',
            start_url: '/',
            display: 'standalone',
            icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
        };

        const result = validateManifest(manifest);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing 512x512 icon');
    });
});
