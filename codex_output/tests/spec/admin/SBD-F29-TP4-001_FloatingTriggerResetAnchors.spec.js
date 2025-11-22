import { describe, expect, test } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminHtmlPath = path.resolve(__dirname, '../../../../admin.html');

describe('SPEC SBD-F29-TP4-001: Floating trigger reset anchors present', () => {
  test('admin markup exposes the floating trigger, badge, and inline save control for reset wiring', () => {
    const html = fs.readFileSync(adminHtmlPath, 'utf8');
    document.documentElement.innerHTML = html;

    const composer = document.getElementById('inlineBundleComposer');
    const trigger = document.getElementById('bundleFloatingTrigger');
    const badge = document.getElementById('bundleFloatingBadge');
    const saveButton = document.getElementById('inlineBundleSave');

    expect(composer).not.toBeNull();
    expect(trigger).not.toBeNull();
    expect(badge).not.toBeNull();
    expect(saveButton).not.toBeNull();

    expect(trigger?.getAttribute('aria-controls')).toBe('inlineBundleComposer');
    expect(trigger?.hidden).toBe(true);
    expect((badge?.textContent || '').trim()).toBe('');
  });
});
