import { fireEvent, waitFor } from '@testing-library/dom';
import { createCustomerLookupHarness } from '../../fixtures/customerLookupHarness.js';

describe('SPEC F09-TP7-001: Customer lookup clears search input after selection', () => {
  test('selecting a result clears the input, hides the list, and keeps helper copy visible', async () => {
    const harness = await createCustomerLookupHarness();

    harness.search('an');
    harness.emitResults([
      { id: 'cust-1', name: 'Anil Rao', location: 'Bengaluru', whatsApp: '+91 99999 88888' },
    ]);
    await waitFor(() => expect(harness.rows).toHaveLength(1));

    fireEvent.click(harness.rows[0]);

    expect(harness.searchInput.value).toBe('');
    expect(harness.listEl.children).toHaveLength(0);
    expect(harness.emptyEl.hidden).toBe(false);
  });
});
