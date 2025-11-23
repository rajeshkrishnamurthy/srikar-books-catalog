import { describe, expect, test } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminHtmlPath = path.resolve(__dirname, '../../../../admin.html');

describe('SPEC SBD-F30-TP3-004: Admin markup exposes membership badge anchors', () => {
  test('Manage Books > Available provides anchors and loads the membership badge bootstrap', () => {
    const html = fs.readFileSync(adminHtmlPath, 'utf8');
    document.documentElement.innerHTML = html;

    const list = document.getElementById('availableBooksList');
    const pagination = document.getElementById('availableBooksPagination');
    const bootstrapScript = Array.from(document.querySelectorAll('script[src]')).find((node) =>
      (node.getAttribute('src') || '').includes('membership-count-badge/available-books.bootstrap.js')
    );

    expect(list).not.toBeNull();
    expect(pagination).not.toBeNull();
    expect(bootstrapScript).toBeDefined();
  });
});
