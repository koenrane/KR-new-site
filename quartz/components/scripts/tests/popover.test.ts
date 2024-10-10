/**
 * @jest-environment jsdom
 */

import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { createPopover, setPopoverPosition, PopoverOptions, attachPopoverEventListeners, escapeLeadingIdNumber } from '../popover_helpers';

// Enable fake timers before all tests
beforeAll(() => {
    jest.useFakeTimers();
});

// Clean up after all tests
afterAll(() => {
    jest.useRealTimers();
});

// Reset mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.MockedFunction<typeof fetch>) = jest.fn(
        (input: RequestInfo | URL, init?: RequestInit) => {
            if (typeof input === 'string' && input.toString().includes('text/html')) {
                return Promise.resolve({
                    headers: {
                        get: (header: string) => {
                            if (header === 'Content-Type') return 'text/html';
                            return null;
                        },
                    },
                    text: () => Promise.resolve('<html><body><div class="popover-hint">Test content</div></body></html>'),
                } as unknown as Response);
            } else if (input.toString().includes('image/jpeg')) {
                return Promise.resolve({
                    headers: {
                        get: (header: string) => {
                            if (header === 'Content-Type') return 'image/jpeg';
                            return null;
                        },
                    },
                    blob: () => Promise.resolve(new Blob()),
                } as unknown as Response);
            }

            return Promise.reject(new Error('Network error'));
        }
    );
});

describe('createPopover', () => {
    let options: PopoverOptions;

    beforeEach(() => {
        options = {
            parentElement: document.createElement('div'),
            targetUrl: new URL('http://example.com'),
            linkElement: document.createElement('a') as unknown as HTMLLinkElement,
        };
    });

    it('should create a popover element', async () => {
        const popover = await createPopover(options);
        expect(popover).toBeInstanceOf(HTMLElement);
        expect(popover.classList.contains('popover')).toBe(true);
    });

    it('should handle HTML content', async () => {
        options.targetUrl = new URL('http://example.com/text/html');
        const popover = await createPopover(options);
        const inner = popover.querySelector('.popover-inner');
        expect(inner?.innerHTML).toContain('<div class="popover-hint">Test content</div>');
        expect(inner?.textContent).toContain('Test content');
    });

    it('should handle image content', async () => {
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            Promise.resolve({
                headers: {
                    get: () => 'image/jpeg',
                },
                blob: () => Promise.resolve(new Blob()),
            } as unknown as Response)
        );

        const popover = await createPopover(options);
        const img = popover.querySelector('img');
        expect(img).toBeTruthy();
        expect(img?.src).toBe('http://example.com/');
    });

    it('should handle error cases', async () => {
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            Promise.reject(new Error('Network error'))
        );

        const popover = await createPopover(options);
        const inner = popover.querySelector('.popover-inner');
        expect(inner?.textContent).toBe('Error loading content');
    });
});

// Check that the popover is positioned within the viewport
describe('setPopoverPosition', () => {
    let popoverElement: HTMLElement;
    let linkElement: HTMLLinkElement;

    beforeEach(() => {
        popoverElement = document.createElement('div');
        linkElement = document.createElement('a') as unknown as HTMLLinkElement;
        Object.defineProperty(popoverElement, 'offsetWidth', { value: 200 });
        Object.defineProperty(popoverElement, 'offsetHeight', { value: 100 });

        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });

        // Mock scroll position
        Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    });

    it('should set popover position within bounds when link is near the right edge', () => {
        jest.spyOn(linkElement, 'getBoundingClientRect').mockReturnValue({
            bottom: 100,
            left: 900,
            right: 1000,
            top: 80,
            width: 100,
            height: 20,
        } as DOMRect);

        setPopoverPosition(popoverElement, linkElement);

        const right = parseInt(popoverElement.style.right);
        const top = parseInt(popoverElement.style.top);

        expect(right).toBeGreaterThanOrEqual(210); // popoverWidth + 10
        expect(right).toBeLessThanOrEqual(window.innerWidth - 10);
        expect(top).toBeGreaterThanOrEqual(window.scrollY + 10);
        expect(top + 100).toBeLessThanOrEqual(window.scrollY + window.innerHeight - 10);
    });

    it('should set popover position within bounds when link is near the bottom edge', () => {
        jest.spyOn(linkElement, 'getBoundingClientRect').mockReturnValue({
            bottom: 750,
            left: 500,
            right: 600,
            top: 730,
            width: 100,
            height: 20,
        } as DOMRect);

        setPopoverPosition(popoverElement, linkElement);

        const right = parseInt(popoverElement.style.right);
        const top = parseInt(popoverElement.style.top);

        expect(right).toBeGreaterThanOrEqual(210); // popoverWidth + 10
        expect(right).toBeLessThanOrEqual(window.innerWidth - 10);
        expect(top).toBeGreaterThanOrEqual(window.scrollY + 10);
        expect(top + 100).toBeLessThanOrEqual(window.scrollY + window.innerHeight - 10);
    });

    it('should set popover position within bounds when page is scrolled', () => {
        Object.defineProperty(window, 'scrollY', { value: 500 });

        jest.spyOn(linkElement, 'getBoundingClientRect').mockReturnValue({
            bottom: 600,
            left: 500,
            right: 600,
            top: 580,
            width: 100,
            height: 20,
        } as DOMRect);

        setPopoverPosition(popoverElement, linkElement);

        const right = parseInt(popoverElement.style.right);
        const top = parseInt(popoverElement.style.top);

        expect(right).toBeGreaterThanOrEqual(210); // popoverWidth + 10
        expect(right).toBeLessThanOrEqual(window.innerWidth - 10);
        expect(top).toBeGreaterThanOrEqual(window.scrollY + 10);
        expect(top + 100).toBeLessThanOrEqual(window.scrollY + window.innerHeight - 10);
    });
});

describe('attachPopoverEventListeners', () => {
    let popoverElement: HTMLElement;
    let linkElement: HTMLLinkElement;
    let cleanup: () => void;

    beforeEach(() => {
        popoverElement = document.createElement('div');
        linkElement = document.createElement('a') as unknown as HTMLLinkElement;
        cleanup = attachPopoverEventListeners(popoverElement, linkElement);
    });

    afterEach(() => {
        cleanup();
    });

    it('should show popover on link mouseenter', () => {
        linkElement.dispatchEvent(new MouseEvent('mouseenter'));
        expect(popoverElement.classList.contains('popover-visible')).toBe(true);
    });

    it('should remove popover on link mouseleave', () => {
        linkElement.dispatchEvent(new MouseEvent('mouseleave'));
        jest.advanceTimersByTime(300);
        expect(popoverElement.classList.contains('visible')).toBe(false);
    });

    it('should handle popover mouseenter and mouseleave', () => {
        popoverElement.dispatchEvent(new MouseEvent('mouseenter'));
        popoverElement.dispatchEvent(new MouseEvent('mouseleave'));
        jest.advanceTimersByTime(300);
        expect(popoverElement.classList.contains('visible')).toBe(false);
    });

    it('should handle click on popover', () => {
        const mockHref = 'http://example.com/';
        linkElement.href = mockHref;
        Object.defineProperty(window, 'location', {
            value: { href: '' },
            writable: true,
        });

        popoverElement.dispatchEvent(new MouseEvent('click'));
        expect(window.location.href).toBe(mockHref);
    });
});

describe('escapeLeadingIdNumber', () => {
    it('should escape leading ID numbers', () => {
        expect(escapeLeadingIdNumber('#1 Test')).toBe('#_1 Test');
        expect(escapeLeadingIdNumber('No number')).toBe('No number');
        expect(escapeLeadingIdNumber('#123 Multiple digits')).toBe('#_123 Multiple digits');
    });
});