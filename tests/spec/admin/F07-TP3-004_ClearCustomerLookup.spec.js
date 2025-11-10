import { jest } from '@jest/globals';
import { createCustomerLookupHarness } from '../../fixtures/customerLookupHarness.js';

describe('SPEC F07-TP3-004: Clearing the lookup resets state', () => {
  test('clear button wipes search input, hides list, and notifies consumer', async () => {
    const onSelect = jest.fn();
    const harness = await createCustomerLookupHarness({ onSelect });

    harness.search('Zoya');
    harness.emitResults([
      { id: 'cust-10', name: 'Zoya Malik', location: 'Mumbai', whatsApp: '+91 90000 11111' },
    ]);
    expect(harness.rows.length).toBeGreaterThan(0);

    harness.clickClear();

    expect(harness.searchInput.value).toBe('');
    expect(onSelect).toHaveBeenCalledWith(null);
    expect(harness.listEl.children.length).toBe(0);
    expect(harness.emptyEl.textContent.toLowerCase()).toContain('start typing');
  });
});
