import { describe, expect, test } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SPEC SBD-F27-TP1-001: Admin page exposes toast anchors', () => {
  test('admin.html contains toast stack, live region, and template with polite announcements', () => {
    const adminHtmlPath = path.resolve(__dirname, '../../../../admin.html');
    const html = fs.readFileSync(adminHtmlPath, 'utf8');

    document.documentElement.innerHTML = html;

    const stack = document.getElementById('toastStack');
    const liveRegion = document.getElementById('toastLiveRegion');
    const template = document.getElementById('toastTemplate');

    expect(stack).not.toBeNull();
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
    expect(template).not.toBeNull();
    expect(template?.tagName?.toLowerCase()).toBe('template');
  });
});
