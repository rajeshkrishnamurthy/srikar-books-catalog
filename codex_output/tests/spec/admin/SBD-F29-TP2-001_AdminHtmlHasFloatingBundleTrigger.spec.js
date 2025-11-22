import { describe, expect, test } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminHtmlPath = path.resolve(__dirname, '../../../../admin.html');

describe('SPEC SBD-F29-TP2-001: Admin markup exposes floating bundle trigger', () => {
  test('Manage Books markup renders the floating trigger + badge tied to the inline bundle composer', () => {
    const html = fs.readFileSync(adminHtmlPath, 'utf8');
    document.documentElement.innerHTML = html;

    const trigger = document.getElementById('bundleFloatingTrigger');
    const badge = document.getElementById('bundleFloatingBadge');
    const composer = document.getElementById('inlineBundleComposer');

    expect(composer).not.toBeNull();
    expect(trigger).not.toBeNull();
    expect(badge).not.toBeNull();
    expect(trigger?.getAttribute('aria-controls')).toBe('inlineBundleComposer');

    expect(trigger?.hidden).toBe(true);
    expect((badge?.textContent || '').trim()).toBe('');
  });
});
