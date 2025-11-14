import { waitFor } from '@testing-library/dom';
import { createCustomerLookupHarness } from '../../fixtures/customerLookupHarness.js';

describe('SPEC F07-TP3-002: Lookup debounces queries before filtering results', () => {
  test('typing waits for debounce then filters customers by name only', async () => {
    const harness = await createCustomerLookupHarness();
    harness.emitResults([
      { id: 'cust-1', name: 'Anil Rao', location: 'Bengaluru' },
      { id: 'cust-2', name: 'Meera Iyer', location: 'Hyderabad' },
      { id: 'cust-3', name: 'Ravi Kumar', location: 'Chennai' },
    ]);

    harness.search('  me  ');

    expect(harness.searchInput.value).toBe('  me  ');
    await waitFor(() => {
      expect(harness.rows).toHaveLength(1);
    });
    expect(harness.rows[0].textContent).toContain('Meera');
    expect(harness.rows[0].textContent).not.toContain('Anil');
    expect(harness.rows[0].textContent).not.toContain('Ravi');
    expect(harness.mocks.getDocs).not.toHaveBeenCalled();
  });
});
