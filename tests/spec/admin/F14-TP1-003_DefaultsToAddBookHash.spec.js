import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F14-TP1-003: Default route writes #add-book for deep linking', () => {
  test('Loading /admin without a hash rewrites window.location.hash to #add-book', async () => {
    const harness = await createAdminMainHarness({ initialHash: '' });
    try {
      expect(harness.locationHash).toBe('');

      await harness.simulateSignIn();

      expect(harness.locationHash).toBe('#add-book');
    } finally {
      harness.cleanup();
    }
  });
});
