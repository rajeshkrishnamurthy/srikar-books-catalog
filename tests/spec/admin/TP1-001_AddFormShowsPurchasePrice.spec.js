/*
SPEC TP1-001: Add form exposes purchase price input
Given an admin opens the add-book form
When they inspect the available fields
Then there is a dedicated purchase price input configured for numeric entry
*/

import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';

const adminHtmlPath = new URL('../../../admin.html', import.meta.url);

describe('SPEC TP1-001: Purchase price field is visible', () => {
  test('add book form includes a numeric purchase price input', () => {
    const markup = readFileSync(adminHtmlPath, 'utf-8');
    const parser = new DOMParser();
    const dom = parser.parseFromString(markup, 'text/html');
    const purchaseInput = dom.querySelector('input[name="purchasePrice"]');

    expect(purchaseInput).not.toBeNull();
    expect(purchaseInput?.getAttribute('inputmode')).toBe('numeric');
    const placeholder = purchaseInput
      ?.getAttribute('placeholder')
      ?.toLowerCase();
    expect(placeholder).toBeTruthy();
    expect(placeholder).toMatch(/purchase|cost/);
  });
});
