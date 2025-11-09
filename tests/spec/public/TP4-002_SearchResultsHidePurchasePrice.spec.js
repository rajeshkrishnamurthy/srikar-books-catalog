import { createPublicCatalogHarness } from '../../fixtures/publicCatalogHarness.js';

describe('SPEC TP4-002: Search results hide purchase price', () => {
  test('filtered render never mentions purchase price even when sale price is shown', async () => {
    const harness = await createPublicCatalogHarness();
    const docs = [
      {
        id: 'pub-2',
        title: 'Searchable Book',
        author: 'Lookup Author',
        condition: 'Gently used',
        purchasePrice: 250,
        price: 499,
        mrp: 799,
        description: 'A book worth searching',
      },
    ];

    harness.render(docs, 'searchable');

    const text = harness.gridEl.textContent.toLowerCase();
    expect(text).toContain('my price : ₹499'.toLowerCase());
    expect(text).not.toContain('purchase price');
    expect(text).not.toContain('250');
  });
});
