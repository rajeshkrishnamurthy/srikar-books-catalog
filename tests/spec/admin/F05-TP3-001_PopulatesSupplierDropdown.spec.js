import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';

const adminHtmlPath = new URL('../../../admin.html', import.meta.url);

describe('SPEC F05-TP3-001: Supplier dropdown is present', () => {
  test('Add Book form contains a supplier select with a placeholder option', () => {
    const markup = readFileSync(adminHtmlPath, 'utf-8');
    const parser = new DOMParser();
    const dom = parser.parseFromString(markup, 'text/html');
    const supplierSelect = dom.querySelector('select[name="supplierId"]');

    expect(supplierSelect).not.toBeNull();
    const placeholder = supplierSelect?.querySelector('option[disabled]');
    expect(placeholder?.textContent?.toLowerCase() || '').toContain('supplier');
  });
});
