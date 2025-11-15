import * as dataHelpers from '../../../scripts/helpers/data.js';

describe('UNIT F18-TP1: pagination contract helpers', () => {
  test('F18-TP1-001_NormalizeDefaults', () => {
    const request = dataHelpers.createPaginationRequest?.({
      pageSize: undefined,
      direction: undefined,
      cursors: {},
      defaults: { pageSize: 20 }
    });

    expect(request).toEqual({
      pageSize: 20,
      direction: 'forward',
      cursor: null,
      cursorType: 'start'
    });
  });

  test('F18-TP1-002_ClampPageSizeIntoSafeRange', () => {
    const tooSmall = dataHelpers.createPaginationRequest?.({
      pageSize: 0,
      direction: 'forward',
      cursors: {},
      defaults: { pageSize: 25, minPageSize: 5, maxPageSize: 50 }
    });

    const tooLarge = dataHelpers.createPaginationRequest?.({
      pageSize: 999,
      direction: 'forward',
      cursors: {},
      defaults: { pageSize: 25, minPageSize: 5, maxPageSize: 50 }
    });

    expect(tooSmall).toEqual(
      expect.objectContaining({
        pageSize: 5
      })
    );

    expect(tooLarge).toEqual(
      expect.objectContaining({
        pageSize: 50
      })
    );
  });

  test('F18-TP1-003_BuildsNormalizedPageStateMetadata', () => {
    const pageState = dataHelpers.buildPaginationState?.({
      items: [{ id: 'a' }, { id: 'b' }],
      pageSize: 2,
      hasNext: true,
      hasPrev: false,
      cursors: {
        start: 'cursor-a',
        end: 'cursor-b'
      }
    });

    expect(pageState).toEqual({
      items: [{ id: 'a' }, { id: 'b' }],
      meta: {
        pageSize: 2,
        count: 2,
        hasNext: true,
        hasPrev: false,
        cursors: {
          start: 'cursor-a',
          end: 'cursor-b'
        }
      }
    });
  });
});

