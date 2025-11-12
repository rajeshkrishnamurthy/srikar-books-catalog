import { fireEvent } from '@testing-library/dom';
import { createSalesHeaderHarness } from '../../fixtures/salesHeaderHarness.js';

describe('SPEC F09-TP5-002: Change customer control clears the selection explicitly', () => {
  test('clicking Change customer resets the summary pill and hidden customer ID', async () => {
    const harness = await createSalesHeaderHarness();
    harness.selectCustomer({
      id: 'cust-2',
      name: 'Meera',
      location: 'Hyderabad',
      whatsApp: '+91 91234 56789',
    });
    expect(harness.customerIdInput.value).toBe('cust-2');
    expect(harness.customerSummary.dataset.empty).toBe('false');

    const changeBtn = harness.changeCustomerBtn;
    expect(changeBtn).not.toBeNull();
    changeBtn.hidden = false;
    fireEvent.click(changeBtn);

    expect(harness.customerIdInput.value).toBe('');
    expect(harness.customerSummary.dataset.empty).toBe('true');
    expect(harness.customerSummary.textContent).toMatch(/No customer selected/i);
  });
});
