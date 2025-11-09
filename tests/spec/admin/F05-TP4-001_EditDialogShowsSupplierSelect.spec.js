import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';

const adminHtmlPath = new URL('../../../admin.html', import.meta.url);

describe('SPEC F05-TP4-001: Edit dialog supplier select', () => {
  test('Edit Book dialog contains supplier dropdown with placeholder', () => {
    const markup = readFileSync(adminHtmlPath, 'utf-8');
    const parser = new DOMParser();
    const dom = parser.parseFromString(markup, 'text/html');
    const select = dom.querySelector('select[name="esupplierId"]');

    expect(select).not.toBeNull();
    const placeholder = select?.querySelector('option[disabled]');
    expect((placeholder?.textContent || '').toLowerCase()).toContain('supplier');
  });
});
