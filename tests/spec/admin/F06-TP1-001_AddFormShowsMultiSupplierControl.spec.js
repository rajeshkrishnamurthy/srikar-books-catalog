import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';

const adminHtmlPath = new URL('../../../admin.html', import.meta.url);

describe('SPEC F06-TP1-001: Add form supports multi-supplier selection', () => {
  test('Add Book form contains a multi-select supplier control', () => {
    const markup = readFileSync(adminHtmlPath, 'utf-8');
    const parser = new DOMParser();
    const dom = parser.parseFromString(markup, 'text/html');

    const multiSelect = dom.querySelector('select[name="supplierIds"]');

    expect(multiSelect).not.toBeNull();
    expect(multiSelect?.hasAttribute('multiple')).toBe(true);
    const placeholder = multiSelect?.querySelector('option[disabled]');
    expect((placeholder?.textContent || '').toLowerCase()).toContain('supplier');
  });
});
