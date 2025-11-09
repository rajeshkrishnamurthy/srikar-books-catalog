import { createPublicCatalogHarness } from '../../fixtures/publicCatalogHarness.js';

describe('SPEC TP4-001: Catalog cards hide purchase price', () => {
  test('rendered cards omit any purchase price labels or values', async () => {
    const harness = await createPublicCatalogHarness();
    const docs = [
      {
        id: 'pub-1',
        title: 'Hidden Cost Book',
        author: 'Anon Writer',
        condition: 'Good as new',
        purchasePrice: 999,
        price: null,
        mrp: null,
      },
    ];

    harness.render(docs);

    const text = harness.gridEl.textContent.toLowerCase();
    expect(text).not.toContain('purchase price');
    expect(text).not.toContain('999');
  });
});
