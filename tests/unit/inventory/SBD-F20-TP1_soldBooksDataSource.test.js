import { jest } from '@jest/globals';
import * as paginationModule from '../../../scripts/admin/availablePagination.js';

const { createSoldBooksDataSource } = paginationModule;

function createDoc(id, data = {}) {
  return {
    id,
    data: () => ({ ...data }),
  };
}

function buildDeps() {
  const db = Symbol('db');
  const collectionRef = Symbol('salesCollection');
  const baseQuery = Symbol('salesQuery');

  const collection = jest.fn(() => collectionRef);
  const where = jest.fn(() => Symbol('where'));
  const orderBy = jest.fn(() => Symbol('orderBy'));
  const limit = jest.fn(() => Symbol('limit'));
  const limitToLast = jest.fn(() => Symbol('limitToLast'));
  const startAfter = jest.fn((cursor) => ({ type: 'startAfter', cursor }));
  const endBefore = jest.fn((cursor) => ({ type: 'endBefore', cursor }));
  const query = jest.fn(() => baseQuery);
  const getDocs = jest.fn();
  const countSold = jest.fn();

  return {
    db,
    collection,
    where,
    orderBy,
    limit,
    limitToLast,
    startAfter,
    endBefore,
    query,
    getDocs,
    countSold,
  };
}

describe('UNIT SBD-F20-TP1: sold books pagination data source', () => {
  test('SBD-F20-TP1-001_SoldQueryUsesSaleDateOrdering', async () => {
    expect(typeof createSoldBooksDataSource).toBe('function');
    if (typeof createSoldBooksDataSource !== 'function') {
      return;
    }

    const deps = buildDeps();
    const docs = [
      createDoc('sold-1', {
        bookTitle: 'Zero to One',
        salePrice: 450,
        customer: { id: 'cust-1', name: 'Lara' },
        soldOn: '2024-02-01T00:00:00.000Z',
        totals: { amount: 450, count: 1 },
      }),
    ];
    deps.getDocs.mockResolvedValueOnce({ docs, size: docs.length });
    deps.countSold.mockResolvedValueOnce(1);

    const dataSource = createSoldBooksDataSource(deps);
    await dataSource({
      request: {
        pageSize: 10,
        direction: 'forward',
        cursor: null,
      },
      offset: 0,
    });

    expect(deps.collection).toHaveBeenCalledWith(deps.db, 'sales');
    expect(deps.where).toHaveBeenCalledWith('status', '==', 'sold');
    expect(deps.orderBy).toHaveBeenCalledWith('soldOn', 'desc');
    expect(deps.limit).toHaveBeenCalledWith(11);
    expect(deps.getDocs).toHaveBeenCalledTimes(1);
    expect(deps.countSold).toHaveBeenCalledWith({});
  });

  test('SBD-F20-TP1-002_SoldCursorPagingHonorsDirection', async () => {
    expect(typeof createSoldBooksDataSource).toBe('function');
    if (typeof createSoldBooksDataSource !== 'function') {
      return;
    }

    const deps = buildDeps();
    const docsForward = [
      createDoc('sold-1', {}),
      createDoc('sold-2', {}),
      createDoc('sold-3', {}),
      createDoc('sold-4', {}),
    ];
    const docsBackward = [
      createDoc('sold-5', {}),
      createDoc('sold-6', {}),
      createDoc('sold-7', {}),
      createDoc('sold-8', {}),
    ];

    deps.getDocs
      .mockResolvedValueOnce({ docs: docsForward, size: docsForward.length })
      .mockResolvedValueOnce({ docs: docsBackward, size: docsBackward.length });
    deps.countSold.mockResolvedValue(20);

    const dataSource = createSoldBooksDataSource(deps);
    const forwardCursor = { id: 'cursor-12' };
    await dataSource({
      request: {
        pageSize: 3,
        direction: 'forward',
        cursor: forwardCursor,
        currentOffset: 9,
      },
      offset: 9,
    });

    expect(deps.startAfter).toHaveBeenCalledWith(forwardCursor);
    expect(deps.limit).toHaveBeenCalledWith(4);

    const backwardCursor = { id: 'cursor-8' };
    const result = await dataSource({
      request: {
        pageSize: 3,
        direction: 'backward',
        cursor: backwardCursor,
        currentOffset: 9,
      },
      offset: 6,
    });

    expect(deps.endBefore).toHaveBeenCalledWith(backwardCursor);
    expect(deps.limitToLast).toHaveBeenCalledWith(4);
    expect(result.pageMeta.hasPrev).toBe(true);
    expect(result.pageMeta.count).toBe(3);
  });

  test('SBD-F20-TP1-003_SoldRecordsExposeSaleFields', async () => {
    expect(typeof createSoldBooksDataSource).toBe('function');
    if (typeof createSoldBooksDataSource !== 'function') {
      return;
    }

    const deps = buildDeps();
    const docs = [
      createDoc('sold-line-1', {
        bookTitle: 'Zero to One',
        salePrice: 450,
        customer: { id: 'cust-1', name: 'Lara', location: 'Delhi' },
        soldOn: '2024-02-01T00:00:00.000Z',
        totals: { amount: 450, count: 1 },
      }),
      createDoc('sold-line-2', {
        bookTitle: 'Atomic Habits',
        salePrice: 520,
        customer: { id: 'cust-2', name: 'Raj', location: 'Mumbai' },
        soldOn: '2024-01-28T00:00:00.000Z',
        totals: { amount: 520, count: 1 },
      }),
      createDoc('sentinel', {
        bookTitle: 'Ignore',
        salePrice: 0,
        soldOn: '2024-01-27T00:00:00.000Z',
        totals: { amount: 0, count: 0 },
      }),
    ];
    deps.getDocs.mockResolvedValueOnce({ docs, size: docs.length });
    deps.countSold.mockResolvedValueOnce(8);

    const dataSource = createSoldBooksDataSource(deps);
    const result = await dataSource({
      request: {
        pageSize: 2,
        direction: 'forward',
        cursor: null,
      },
      offset: 0,
    });

    expect(result.items).toEqual([
      {
        id: 'sold-line-1',
        bookTitle: 'Zero to One',
        salePrice: 450,
        customer: { id: 'cust-1', name: 'Lara', location: 'Delhi' },
        soldOn: '2024-02-01T00:00:00.000Z',
        totals: { amount: 450, count: 1 },
      },
      {
        id: 'sold-line-2',
        bookTitle: 'Atomic Habits',
        salePrice: 520,
        customer: { id: 'cust-2', name: 'Raj', location: 'Mumbai' },
        soldOn: '2024-01-28T00:00:00.000Z',
        totals: { amount: 520, count: 1 },
      },
    ]);
    expect(result.pageMeta).toEqual({
      pageSize: 2,
      count: 2,
      hasNext: true,
      hasPrev: false,
      cursors: {
        start: docs[0],
        end: docs[1],
      },
    });
    expect(result.totalItems).toBe(8);
  });

  test('SBD-F20-TP1-004_FinalPagesReportAccurateMeta', async () => {
    expect(typeof createSoldBooksDataSource).toBe('function');
    if (typeof createSoldBooksDataSource !== 'function') {
      return;
    }

    const deps = buildDeps();
    const docs = [
      createDoc('sold-line-7', {
        bookTitle: 'Can Love Happen Twice',
        salePrice: 250,
        customer: { id: 'cust-9', name: 'Mini' },
        soldOn: '2024-01-10T00:00:00.000Z',
        totals: { amount: 250, count: 1 },
      }),
      createDoc('sold-line-8', {
        bookTitle: 'Rich Dad Poor Dad',
        salePrice: 300,
        customer: { id: 'cust-10', name: 'Dev' },
        soldOn: '2024-01-09T00:00:00.000Z',
        totals: { amount: 300, count: 1 },
      }),
    ];
    deps.getDocs.mockResolvedValueOnce({ docs, size: docs.length });
    deps.countSold.mockResolvedValueOnce(8);

    const dataSource = createSoldBooksDataSource(deps);
    const result = await dataSource({
      request: {
        pageSize: 3,
        direction: 'forward',
        cursor: null,
        currentOffset: 6,
      },
      offset: 6,
    });

    expect(result.items).toHaveLength(2);
    expect(result.pageMeta.count).toBe(2);
    expect(result.pageMeta.hasNext).toBe(false);
    expect(result.pageMeta.hasPrev).toBe(true);
    expect(result.offset).toBe(8);
    expect(result.currentOffset).toBe(6);
    expect(result.totalItems).toBe(8);
  });
});
