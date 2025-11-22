import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';

const adminHtmlPath = new URL('../../../admin.html', import.meta.url);

describe('SPEC SBD-F23-TP1-001: Available panel exposes inline bundle composer shell', () => {
  test('admin.html ships the inline composer container with stable selectors and empty state', () => {
    const markup = readFileSync(adminHtmlPath, 'utf-8');
    const dom = new DOMParser().parseFromString(markup, 'text/html');
    const availablePanel = dom.querySelector('#availableBooksPanel');
    expect(availablePanel).not.toBeNull();

    const composer = availablePanel?.querySelector('#inlineBundleComposer');
    expect(composer).not.toBeNull();
    expect(composer?.getAttribute('role')).toBe('dialog');
    expect(composer?.getAttribute('aria-labelledby')).toBe('inlineBundleHeading');
    expect(composer?.hasAttribute('hidden')).toBe(true);

    const heading = composer?.querySelector('#inlineBundleHeading');
    expect(heading).not.toBeNull();
    expect(heading?.textContent?.toLowerCase() || '').toContain('bundle');

    const bookList = composer?.querySelector('#inlineBundleSelectedBooks');
    expect(bookList).not.toBeNull();
    const emptyState = composer?.querySelector('#inlineBundleEmptyState');
    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent?.toLowerCase() || '').toContain('add a book');

    const saveButton = composer?.querySelector('#inlineBundleSave');
    const resetButton = composer?.querySelector('#inlineBundleReset');
    expect(saveButton).not.toBeNull();
    expect(resetButton).not.toBeNull();
  });
});
