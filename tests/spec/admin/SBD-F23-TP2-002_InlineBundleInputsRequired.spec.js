import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';

const adminHtmlPath = new URL('../../../admin.html', import.meta.url);

describe('SPEC SBD-F23-TP2-002: Bundle name/price inputs show required affordances', () => {
  test('name and price inputs declare required attributes and reuse the helper copy via aria-describedby', () => {
    const markup = readFileSync(adminHtmlPath, 'utf-8');
    const dom = new DOMParser().parseFromString(markup, 'text/html');
    const composer = dom.querySelector('#inlineBundleComposer');
    expect(composer).not.toBeNull();

    const helperId = 'inlineBundleHelper';
    const nameInput = composer?.querySelector('#inlineBundleName');
    const priceInput = composer?.querySelector('#inlineBundlePrice');

    expect(nameInput).not.toBeNull();
    expect(priceInput).not.toBeNull();

    expect(nameInput?.hasAttribute('required')).toBe(true);
    expect(priceInput?.hasAttribute('required')).toBe(true);
    expect(nameInput?.getAttribute('aria-required')).toBe('true');
    expect(priceInput?.getAttribute('aria-required')).toBe('true');
    expect(nameInput?.getAttribute('aria-describedby')).toBe(helperId);
    expect(priceInput?.getAttribute('aria-describedby')).toBe(helperId);
  });
});
