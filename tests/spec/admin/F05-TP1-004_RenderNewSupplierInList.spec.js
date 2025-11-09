import { createAdminSupplierHarness } from '../../fixtures/adminSupplierHarness.js';

describe('SPEC F05-TP1-004: Render supplier list', () => {
  test('renders suppliers sorted alphabetically with name and location', async () => {
    const harness = await createAdminSupplierHarness();
    harness.emitSuppliers([
      { id: 'sup-2', name: 'Zen Traders', location: 'Hyderabad' },
      { id: 'sup-1', name: 'Acme Books', location: 'Bengaluru' },
    ]);

    const rows = Array.from(harness.listEl.querySelectorAll('li')).map((li) =>
      li.textContent.trim()
    );

    expect(rows.length).toBe(2);
    expect(rows[0].toLowerCase()).toContain('acme books');
    expect(rows[0].toLowerCase()).toContain('bengaluru');
    expect(rows[1].toLowerCase()).toContain('zen traders');
  });
});
