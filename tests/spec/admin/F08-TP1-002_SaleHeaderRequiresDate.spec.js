import { createSalesHeaderHarness } from '../../fixtures/salesHeaderHarness.js';

describe('SPEC F08-TP1-002: Sale header requires a valid sale date', () => {
  test('missing date blocks submission even if customer selected', async () => {
    const harness = await createSalesHeaderHarness();
    harness.selectCustomer({ id: 'cust-7', name: 'Lakshmi Traders' });

    harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('date');
    expect(harness.onHeaderReady).not.toHaveBeenCalled();
  });

  test('wrong formats surface guidance about dd-mon-yy', async () => {
    const harness = await createSalesHeaderHarness();
    harness.selectCustomer({ id: 'cust-7', name: 'Lakshmi Traders' });
    harness.setSaleDate('2024-02-10'); // wrong format

    harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('dd-mon-yy');
    expect(harness.onHeaderReady).not.toHaveBeenCalled();
  });

  test('future dates are rejected with inline error', async () => {
    const harness = await createSalesHeaderHarness({
      clock: { now: () => new Date('2024-03-15T00:00:00Z') },
    });
    harness.selectCustomer({ id: 'cust-7', name: 'Lakshmi Traders' });
    harness.setSaleDate('20-Mar-24');

    harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('future');
    expect(harness.onHeaderReady).not.toHaveBeenCalled();
  });

  test('same calendar day in ahead-of-UTC timezones is accepted', async () => {
    const harness = await createSalesHeaderHarness({
      clock: {
        now: () => new Date('2024-03-09T20:30:00Z'),
        todayIso: () => '2024-03-10', // Force local calendar day to 10-Mar irrespective of host TZ
      },
    });
    harness.selectCustomer({ id: 'cust-11', name: 'Saanvi Menon' });
    harness.setSaleDate('10-Mar-24');

    harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).not.toContain('future');
    expect(harness.onHeaderReady).toHaveBeenCalledTimes(1);
  });
});
