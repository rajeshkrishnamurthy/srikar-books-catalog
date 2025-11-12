import { fireEvent } from '@testing-library/dom';
import { createCustomerLookupHarness } from '../../fixtures/customerLookupHarness.js';

describe('SPEC F09-TP5-001: Customer selection persists when lookup input resets', () => {
  test('clearing the search input does not clear the selected customer or emit a null selection', async () => {
    const harness = await createCustomerLookupHarness();
    harness.emitResults([
      {
        id: 'cust-1',
        name: 'Anil Rao',
        location: 'Bengaluru',
        whatsApp: '+91 99999 88888',
      },
    ]);

    const row = harness.rows[0];
    fireEvent.click(row.querySelector('button[data-action="select"]'));
    expect(harness.onSelect).toHaveBeenCalledTimes(1);

    harness.searchInput.value = '';
    fireEvent.input(harness.searchInput);
    harness.emitResults([
      {
        id: 'cust-1',
        name: 'Anil Rao',
        location: 'Bengaluru',
      },
    ]);

    expect(harness.onSelect).toHaveBeenCalledTimes(1);
    expect(harness.rows[0].classList.contains('selected')).toBe(true);
  });
});
