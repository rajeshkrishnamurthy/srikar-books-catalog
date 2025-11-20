import { describe, expect, test } from '@jest/globals';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC SBD-F23-TP1-002: Available rows expose Add to bundle action', () => {
  test('rendered Available rows render Add to bundle buttons that target the inline composer', async () => {
    const harness = await createAdminInventoryHarness();

    harness.emitAvailableDocs([
      {
        id: 'book-inline-001',
        title: 'Inline Composer Ready',
        author: 'Spec Author',
        category: 'Fiction',
        binding: 'Paperback',
        price: 399,
        mrp: 499,
        purchasePrice: 250,
      },
    ]);

    const addButton = harness.availList.querySelector("[data-test='bookAddToBundle']");
    expect(addButton).not.toBeNull();
    expect(addButton?.getAttribute('type')).toBe('button');
    expect(addButton?.getAttribute('aria-controls')).toBe('inlineBundleComposer');
    expect(addButton?.getAttribute('aria-expanded')).toBe('false');
    expect(addButton?.textContent?.toLowerCase() || '').toContain('add to bundle');
  });
});
