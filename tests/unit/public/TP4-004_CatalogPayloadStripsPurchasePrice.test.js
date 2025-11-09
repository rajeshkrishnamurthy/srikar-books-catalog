import { jest } from '@jest/globals';

describe('UNIT TP4-004: Catalog payload strips purchase price', () => {
  test('subscribeToAllAvailable removes purchasePrice before invoking callback', async () => {
    const collection = jest.fn(() => ({ type: 'collection' }));
    const where = jest.fn(() => ({}));
    const orderBy = jest.fn(() => ({}));
    const query = jest.fn(() => ({ type: 'query' }));

    const onSnapshot = jest.fn((q, onNext) => {
      onNext({
        docs: [
          {
            id: 'book-public-1',
            data: () => ({ title: 'Book', purchasePrice: 640 }),
          },
        ],
      });
      return jest.fn();
    });

    globalThis.__firebaseMocks = {
      exports: {
        db: {},
        collection,
        query,
        where,
        orderBy,
        onSnapshot,
      },
    };

    const moduleUrl = new URL('../../../scripts/index/catalogService.js', import.meta.url);
    const { subscribeToAllAvailable } = await import(moduleUrl.href);

    const next = jest.fn();
    subscribeToAllAvailable(next, () => {});

    const emitted = next.mock.calls[0][0][0];
    expect(emitted.purchasePrice).toBeUndefined();
    expect(emitted).toHaveProperty('title', 'Book');
  });
});
