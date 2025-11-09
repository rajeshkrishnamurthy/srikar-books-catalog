import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('UNIT TP3-003: Placeholder for missing purchase price', () => {
  test('renders descriptive placeholder text inside .purchase-price', async () => {
    const harness = await createAdminInventoryHarness();

    harness.emitAvailableDocs([
      {
        id: 'unit-missing-1',
        title: 'Placeholder Book',
        author: 'Anon',
        category: 'Drama',
        binding: 'Paperback',
      },
    ]);

    const el = harness.availList.querySelector('.purchase-price');
    expect(el).not.toBeNull();
    expect(el?.textContent.toLowerCase()).toContain('purchase price: not set');
  });
});
