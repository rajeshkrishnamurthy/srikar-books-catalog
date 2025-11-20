import { jest } from '@jest/globals';
import { createAvailableBooksDataSource } from '../../../scripts/admin/availablePagination.js';

function createDoc(id, data = {}) {
  return {
    id,
    data: () => ({ ...data }),
  };
}

function buildDeps() {
  const db = Symbol('db');
  const collectionRef = Symbol('booksCollection');
  const baseQuery = Symbol('booksQuery');

  const collection = jest.fn(() => collectionRef);
  const where = jest.fn(() => Symbol('where'));
  const orderBy = jest.fn(() => Symbol('orderBy'));
  const limit = jest.fn(() => Symbol('limit'));
  const limitToLast = jest.fn(() => Symbol('limitToLast'));
  const startAfter = jest.fn((cursor) => ({ type: 'startAfter', cursor }));
  const endBefore = jest.fn((cursor) => ({ type: 'endBefore', cursor }));
  const query = jest.fn(() => baseQuery);
  const getDocs = jest.fn();
  const countAvailable = jest.fn();

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
    countAvailable,
  };
}

describe('UNIT F19-TP1: available books data source', () => {
  test('F19-TP1-001_BaseQueryUsesAvailableStatus', async () => {
    const deps = buildDeps();
    const docs = [createDoc('book-1', { title: 'First' })];
    deps.getDocs.mockResolvedValueOnce({ docs, size: docs.length });
    deps.countAvailable.mockResolvedValueOnce(1);

    const dataSource = createAvailableBooksDataSource(deps);
    await dataSource({
      request: {
        pageSize: 10,
        direction: 'forward',
        cursorType: 'start',
        cursor: null,
      },
      filters: {},
      offset: 0,
    });

    expect(deps.collection).toHaveBeenCalledWith(deps.db, 'books');
    expect(deps.where).toHaveBeenCalledWith('status', '==', 'available');
    expect(deps.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(deps.limit).toHaveBeenCalledWith(11);
    expect(deps.query).toHaveBeenCalled();
    expect(deps.getDocs).toHaveBeenCalled();
  });

  test('F19-TP1-002_CursorAwareForwardBackwardPaging', async () => {
    const deps = buildDeps();
    const docs = [createDoc('book-11'), createDoc('book-12')];
    deps.getDocs.mockResolvedValue({ docs, size: docs.length });
    deps.countAvailable.mockResolvedValue(12);

    const dataSource = createAvailableBooksDataSource(deps);

    const forwardCursor = { id: 'cursor-20' };
    await dataSource({
      request: {
        pageSize: 5,
        direction: 'forward',
        cursorType: 'start',
        cursor: forwardCursor,
      },
      filters: {},
      offset: 20,
    });

    expect(deps.startAfter).toHaveBeenCalledWith(forwardCursor);

    deps.startAfter.mockClear();
    deps.endBefore.mockClear();
    deps.limitToLast.mockClear();
    deps.limit.mockClear();

    const backwardCursor = { id: 'cursor-10' };
    await dataSource({
      request: {
        pageSize: 5,
        direction: 'backward',
        cursorType: 'end',
        cursor: backwardCursor,
      },
      filters: {},
      offset: 20,
    });

    expect(deps.endBefore).toHaveBeenCalledWith(backwardCursor);
    expect(deps.limitToLast).toHaveBeenCalledWith(6);
  });

  test('F19-TP1-003_ReturnsNormalizedPaginationPayload', async () => {
    const deps = buildDeps();
    const docs = [
      createDoc('book-1', { title: 'Book 1' }),
      createDoc('book-2', { title: 'Book 2' }),
      createDoc('book-3', { title: 'Book 3' }),
      createDoc('book-4', { title: 'Book 4' }), // sentinel
    ];
    deps.getDocs.mockResolvedValueOnce({ docs, size: docs.length });
    deps.countAvailable.mockResolvedValueOnce(42);

    const dataSource = createAvailableBooksDataSource(deps);
    const result = await dataSource({
      request: {
        pageSize: 3,
        direction: 'forward',
        cursorType: 'start',
        cursor: null,
      },
      filters: { supplierId: 'sup-7' },
      offset: 0,
    });

    expect(deps.where).toHaveBeenCalledWith('supplierId', '==', 'sup-7');
    expect(deps.countAvailable).toHaveBeenCalledWith({ supplierId: 'sup-7' });
    expect(result.items).toEqual([
      { id: 'book-1', title: 'Book 1' },
      { id: 'book-2', title: 'Book 2' },
      { id: 'book-3', title: 'Book 3' },
    ]);
    expect(result.pageMeta).toEqual({
      pageSize: 3,
      count: 3,
      hasNext: true,
      hasPrev: false,
      cursors: {
        start: docs[0],
        end: docs[2],
      },
    });
    expect(result.offset).toBe(3);
    expect(result.totalItems).toBe(42);
  });
});
