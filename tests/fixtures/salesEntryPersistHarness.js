import { createSalesLineItemsHarness } from './salesLineItemsHarness.js';

/**
 * Thin wrapper reserved for future specs that need both sale line items
 * and persist wiring. For now it simply proxies to the existing harness.
 */
export async function createSalesEntryPersistHarness(options = {}) {
  return createSalesLineItemsHarness(options);
}
