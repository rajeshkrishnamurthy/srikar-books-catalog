import { fireEvent } from '@testing-library/dom';
import { createCustomerLookupHarness } from '../../fixtures/customerLookupHarness.js';

describe('SPEC F08-TP1-005: Customer lookup row shows selected feedback', () => {
  test('clicking Select highlights the row and replaces the button with a Selected chip', async () => {
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
    expect(row).toBeTruthy();
    const selectBtn = row.querySelector('button[data-action="select"]');
    expect(selectBtn).toBeTruthy();
    fireEvent.click(selectBtn);

    expect(row.dataset.state).toBe('selected');
    expect(row.querySelector('button[data-action="select"]')).toBeNull();
    const chip = row.querySelector('[data-role="selected-chip"]');
    expect(chip).not.toBeNull();
    expect(chip?.textContent).toMatch(/Selected/i);
  });
});
