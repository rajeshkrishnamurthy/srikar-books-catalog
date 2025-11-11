import { createSalesPersistHarness } from '../../fixtures/salesPersistHarness.js';

describe('SPEC F08-TP3-001: Sale submission requires ready header and lines', () => {
  test('blocks submission until the sale header payload exists', async () => {
    const harness = await createSalesPersistHarness();

    await harness.submit();

    expect(harness.getHeaderPayload).toHaveBeenCalled();
    expect(harness.msgEl.textContent.toLowerCase()).toContain('header');
    expect(harness.addDoc).not.toHaveBeenCalled();
  });

  test('blocks submission until at least one line item is ready', async () => {
    const harness = await createSalesPersistHarness();
    harness.setHeaderPayload({
      id: 'sale-header-1',
      customerId: 'cust-9',
      saleDateIso: '2024-05-01',
    });

    await harness.submit();

    expect(harness.getLineItems).toHaveBeenCalled();
    expect(harness.msgEl.textContent.toLowerCase()).toContain('line');
    expect(harness.addDoc).not.toHaveBeenCalled();
  });
});
