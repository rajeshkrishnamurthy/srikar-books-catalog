import { jest } from '@jest/globals';
import { createAdminSupplierHarness } from '../../fixtures/adminSupplierHarness.js';

describe('SPEC F05-TP2-004: Delete supplier when unused', () => {
  beforeEach(() => {
    global.confirm = jest.fn(() => true);
  });

  test('delete removes supplier when no books reference it', async () => {
    const harness = await createAdminSupplierHarness();
    harness.emitSuppliers([{ id: 'sup-99', name: 'Unused Co', location: 'Chennai' }]);

    await harness.clickListButton(0, 'delete');

    expect(harness.mocks.deleteDoc).toHaveBeenCalledTimes(1);
    const ref = harness.mocks.deleteDoc.mock.calls[0][0];
    expect(ref.id).toBe('sup-99');
    expect(harness.msgEl.textContent.toLowerCase()).toContain('removed');
  });
});
