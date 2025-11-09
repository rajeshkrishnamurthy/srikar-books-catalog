import { jest } from '@jest/globals';
import { createAdminSupplierHarness } from '../../fixtures/adminSupplierHarness.js';

describe('SPEC F05-TP2-002: Persist supplier edits', () => {
  beforeEach(() => {
    global.confirm = jest.fn(() => true);
  });

  test('submitting in edit mode calls updateDoc with trimmed values', async () => {
    const harness = await createAdminSupplierHarness();
    harness.emitSuppliers([{ id: 'sup-9', name: 'Book Hub', location: 'Delhi' }]);

    await harness.clickListButton(0, 'edit');
    harness.setField('supplierName', '  Book Hub Plus ');
    harness.setField('supplierLocation', '  Gurugram  ');
    await harness.submit();

    expect(harness.mocks.updateDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = harness.mocks.updateDoc.mock.calls[0];
    expect(ref.id).toBe('sup-9');
    expect(payload.name).toBe('Book Hub Plus');
    expect(payload.location).toBe('Gurugram');
    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
  });

  test('duplicate name during edit is blocked with inline message', async () => {
    const harness = await createAdminSupplierHarness({
      firebaseOverrides: {
        getDocs: jest.fn(async (q) => {
          if (q?.constraints?.some((c) => c.field === 'nameKey')) {
            return { docs: [{ id: 'sup-dup' }], empty: false };
          }
          return { docs: [], empty: true };
        }),
      },
    });
    harness.emitSuppliers([
      { id: 'sup-1', name: 'Acme Books', location: 'Bengaluru' },
      { id: 'sup-2', name: 'Zen Traders', location: 'Hyderabad' },
    ]);

    await harness.clickListButton(0, 'edit');
    harness.setField('supplierName', 'zen traders');
    harness.setField('supplierLocation', 'Chennai');
    await harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('duplicate');
    expect(harness.mocks.updateDoc).not.toHaveBeenCalled();
  });
});
