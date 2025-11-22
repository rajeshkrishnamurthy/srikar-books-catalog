import { describe, expect, test } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SPEC SBD-F28-TP1-001: Toast anchors exist for all admin workflows', () => {
  test('admin.html exposes the shared toast anchors plus edit/bundle/supplier/customer/sale controls', () => {
    const adminHtmlPath = path.resolve(__dirname, '../../../../admin.html');
    const html = fs.readFileSync(adminHtmlPath, 'utf8');

    document.documentElement.innerHTML = html;

    const stack = document.getElementById('toastStack');
    const liveRegion = document.getElementById('toastLiveRegion');
    const template = document.getElementById('toastTemplate');

    const editForm = document.getElementById('editForm');
    const bundleForm = document.getElementById('bundleForm');
    const supplierForm = document.getElementById('supplierForm');
    const customerForm = document.getElementById('customerForm');
    const salePersistBtn = document.getElementById('salePersistBtn');

    expect(stack).not.toBeNull();
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
    expect(template).not.toBeNull();
    expect(template?.tagName?.toLowerCase()).toBe('template');

    expect(editForm).not.toBeNull();
    expect(bundleForm).not.toBeNull();
    expect(supplierForm).not.toBeNull();
    expect(customerForm).not.toBeNull();
    expect(salePersistBtn).not.toBeNull();
  });
});
