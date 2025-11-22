import { describe, expect, test } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminHtmlPath = path.resolve(__dirname, '../../../../admin.html');

describe('SPEC SBD-F29-TP3-001: Inline save toast anchors exist', () => {
  test('Admin markup exposes inline save control plus shared toast stack/live region/template', () => {
    const html = fs.readFileSync(adminHtmlPath, 'utf8');
    document.documentElement.innerHTML = html;

    const saveButton = document.getElementById('inlineBundleSave');
    const toastStack = document.getElementById('toastStack');
    const toastLiveRegion = document.getElementById('toastLiveRegion');
    const toastTemplate = document.getElementById('toastTemplate');
    const dismissSlot = toastTemplate?.content?.querySelector('[data-slot="dismiss"]');

    expect(saveButton).not.toBeNull();
    expect(toastStack).not.toBeNull();
    expect(toastLiveRegion).not.toBeNull();
    expect(toastTemplate).not.toBeNull();
    expect(dismissSlot).not.toBeNull();
    expect(toastLiveRegion?.getAttribute('aria-live')).toBe('polite');
  });
});
