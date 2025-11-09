import { jest } from '@jest/globals';
import { createAdminSupplierHarness } from '../../fixtures/adminSupplierHarness.js';

describe('SPEC F05-TP2-003: Prevent deleting suppliers in use', () => {
  beforeEach(() => {
    global.confirm = jest.fn(() => true);
  });

  test('delete action checks book references and blocks removal when in use', async () => {
    const harness = await createAdminSupplierHarness({
      firebaseOverrides: {
        getDocs: jest.fn(async (q) => {
          if (q?.ref?.path === 'books') {
            return { docs: [{ id: 'book-1' }], empty: false };
          }
          return { docs: [], empty: true };
        }),
      },
    });
    harness.emitSuppliers([{ id: 'sup-42', name: 'In Use Co', location: 'Pune' }]);

    await harness.clickListButton(0, 'delete');

    expect(harness.msgEl.textContent.toLowerCase()).toContain('in use');
    expect(harness.mocks.deleteDoc).not.toHaveBeenCalled();
  });
});
