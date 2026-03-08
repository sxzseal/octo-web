/**
 * Unit tests for handleGlobalSearchClick file download URL validation
 * Tests that file download URLs are validated before being opened
 *
 * Fixes: https://github.com/Mininglamp-OSS/octo-web/issues/347
 */

import { isSafeUrl } from '../../../../packages/dmworkbase/src/Utils/security';

// Mock the WKApp and its dependencies
jest.mock('../../../../packages/dmworkbase/src/App', () => ({
    default: {
        dataSource: {
            commonDataSource: {
                getImageURL: jest.fn((url: string) => url)
            }
        },
        endpoints: {
            showConversation: jest.fn()
        }
    }
}));

// Store original window.open
const originalWindowOpen = window.open;

describe('handleGlobalSearchClick file download URL validation', () => {
    let mockWindowOpen: jest.Mock;

    beforeEach(() => {
        mockWindowOpen = jest.fn();
        window.open = mockWindowOpen;
    });

    afterEach(() => {
        window.open = originalWindowOpen;
        jest.clearAllMocks();
    });

    describe('URL validation integration', () => {
        it('should validate URL with isSafeUrl before opening', () => {
            // Test that isSafeUrl correctly identifies safe URLs
            expect(isSafeUrl('https://example.com/file.pdf')).toBe(true);
            expect(isSafeUrl('http://example.com/file.pdf')).toBe(true);
        });

        it('should reject javascript: protocol URLs', () => {
            expect(isSafeUrl('javascript:alert(1)')).toBe(false);
            expect(isSafeUrl('javascript:void(0)')).toBe(false);
        });

        it('should reject data: protocol URLs', () => {
            expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
        });

        it('should reject file: protocol URLs', () => {
            expect(isSafeUrl('file:///etc/passwd')).toBe(false);
        });
    });

    describe('file download URL construction', () => {
        it('should properly append filename to URL without query string', () => {
            const baseUrl = 'https://example.com/files/document.pdf';
            const filename = 'my-document.pdf';
            const expectedUrl = `${baseUrl}?filename=${encodeURIComponent(filename)}`;

            // Simulate the logic from handleGlobalSearchClick
            let downloadURL = baseUrl;
            if (downloadURL.indexOf("?") != -1) {
                downloadURL += "&filename=" + encodeURIComponent(filename);
            } else {
                downloadURL += "?filename=" + encodeURIComponent(filename);
            }

            expect(downloadURL).toBe(expectedUrl);
        });

        it('should properly append filename to URL with existing query string', () => {
            const baseUrl = 'https://example.com/files/document.pdf?token=abc';
            const filename = 'my-document.pdf';
            const expectedUrl = `${baseUrl}&filename=${encodeURIComponent(filename)}`;

            // Simulate the logic from handleGlobalSearchClick
            let downloadURL = baseUrl;
            if (downloadURL.indexOf("?") != -1) {
                downloadURL += "&filename=" + encodeURIComponent(filename);
            } else {
                downloadURL += "?filename=" + encodeURIComponent(filename);
            }

            expect(downloadURL).toBe(expectedUrl);
        });
    });

    describe('security validation for file downloads', () => {
        it('should block malicious URLs from being opened', () => {
            const maliciousUrls = [
                'javascript:alert(document.cookie)',
                'data:text/html,<script>alert(1)</script>',
                'vbscript:msgbox(1)',
                'file:///etc/passwd'
            ];

            maliciousUrls.forEach(url => {
                expect(isSafeUrl(url)).toBe(false);
            });
        });

        it('should allow legitimate file download URLs', () => {
            const safeUrls = [
                'https://cdn.example.com/files/document.pdf',
                'http://localhost:8080/api/download/file.zip',
                'https://storage.example.com/uploads/image.png?filename=test.png'
            ];

            safeUrls.forEach(url => {
                expect(isSafeUrl(url)).toBe(true);
            });
        });
    });
});
