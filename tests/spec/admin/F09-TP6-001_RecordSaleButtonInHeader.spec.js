import fs from 'node:fs';
import path from 'node:path';

describe('SPEC F09-TP5-001: Record sale button appears beside search in admin header', () => {
  test('admin.html header contains a Record sale button next to the inventory search field', () => {
    const htmlPath = path.join(process.cwd(), 'admin.html');
    const markup = fs.readFileSync(htmlPath, 'utf8');
    document.body.innerHTML = markup;

    const headerActions = document.querySelector('.flex.between + .flex');
    const searchInput = document.getElementById('adminSearch');
    const recordSaleBtn = document.getElementById('recordSaleBtn');

    expect(searchInput).not.toBeNull();
    expect(recordSaleBtn).not.toBeNull();
    expect(recordSaleBtn.textContent).toMatch(/record sale/i);
    expect(recordSaleBtn.className).toContain('admin-nav__item');
    expect(recordSaleBtn.getAttribute('aria-controls')).toBe('saleEntryPanel');
  });
});
