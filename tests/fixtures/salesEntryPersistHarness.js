import { jest } from '@jest/globals';
import { createSalesLineItemsHarness } from './salesLineItemsHarness.js';

const persistModuleUrl = new URL('../../scripts/admin/salesPersist.js', import.meta.url);

export async function createSalesEntryPersistHarness(options = {}) {
  const lineHarness = await createSalesLineItemsHarness(options);
  const { initSalePersist } = await import(persistModuleUrl.href);

  const addDocMock =
    options.addDocMock ||
    jest.fn(async (_, doc) => {
      return { id: 'sale-mock', doc };
    });
  const collectionMock =
    options.collectionMock ||
    jest.fn((db, name) => ({
      db,
      name,
    }));
  const serverTimestamp = options.serverTimestamp || (() => new Date('2023-01-01T00:00:00Z'));

  const persistApi = initSalePersist(
    {
      submitBtn: lineHarness.persistBtn,
      msgEl: lineHarness.persistMsg,
      lineStatusList: lineHarness.statusList,
    },
    {
      db: {},
      collection: collectionMock,
      addDoc: addDocMock,
      serverTimestamp,
      getHeaderPayload:
        options.getHeaderPayload ||
        (() => ({
          headerId: 'header-1',
          customerId: 'cust-123',
          saleDate: '2023-01-01',
        })),
      getLineItems: () => lineHarness.api?.getLines?.() || [],
      formatCurrency: options.formatCurrency || ((value) => `₹${Number(value || 0).toFixed(2)}`),
      onPersisted: options.onPersisted || jest.fn(),
    }
  );

  return {
    ...lineHarness,
    persistApi,
    persistMocks: {
      addDoc: addDocMock,
      collection: collectionMock,
    },
  };
}
