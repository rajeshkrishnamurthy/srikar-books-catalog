import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';

const adminHtmlPath = new URL('../../../admin.html', import.meta.url);

describe('SPEC SBD-F23-TP2-001: Inline composer helper copy anchors bundle rule', () => {
  test('inline composer exposes helper copy with a stable id for describing bundle requirements', () => {
    const markup = readFileSync(adminHtmlPath, 'utf-8');
    const dom = new DOMParser().parseFromString(markup, 'text/html');
    const composer = dom.querySelector('#inlineBundleComposer');
    expect(composer).not.toBeNull();

    const helper = composer?.querySelector('#inlineBundleHelper');
    expect(helper).not.toBeNull();
    expect(helper?.textContent?.toLowerCase() || '').toContain('bundle name');
    expect(helper?.textContent?.toLowerCase() || '').toContain('bundle price');

    const helperId = helper?.getAttribute('id');
    expect(helperId).toBe('inlineBundleHelper');
  });
});
