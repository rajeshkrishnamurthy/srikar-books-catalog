import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F15-TP4-003: Nav detail wrappers are absent from DOM', () => {
  test('adminNavDetails wrapper no longer renders after the cleanup', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      expect(document.getElementById('adminNavDetails')).toBeNull();
      expect(document.querySelector('.admin-nav__details')).toBeNull();
    } finally {
      harness.cleanup();
    }
  });
});
