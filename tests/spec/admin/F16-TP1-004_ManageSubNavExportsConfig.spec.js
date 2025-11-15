import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F16-TP1-004: Manage sub nav exports config for reuse', () => {
  test('Manage sub nav registers its config map for downstream navs', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const config = globalThis.__adminSubNavMap;
      expect(config).toBeDefined();

      const manageConfig = config?.manageBooks;
      expect(manageConfig).toBeDefined();
      expect(manageConfig).toMatchObject({
        parentNav: 'manageBooks',
        elementId: 'manageSubNav',
      });

      expect(manageConfig?.tabs).toEqual(['add', 'available', 'sold']);
    } finally {
      harness.cleanup();
    }
  });
});
