import { jest } from '@jest/globals';

export function buildPaginationControllerStub(stateSequence = []) {
  const defaultState = {
    summaryText: 'Items 0–0 of 0',
    prevDisabled: true,
    nextDisabled: true,
    isBusy: false,
  };

  const queue =
    Array.isArray(stateSequence) && stateSequence.length
      ? [...stateSequence]
      : [defaultState];

  let currentState = queue.shift();

  const advanceState = () => {
    if (queue.length) {
      currentState = queue.shift();
    }
  };

  const controller = {
    getUiState: jest.fn(() => currentState),
    goNext: jest.fn(() => {
      advanceState();
    }),
    goPrev: jest.fn(() => {
      advanceState();
    }),
    loadMore: jest.fn(),
    setFilters: jest.fn(),
    syncFromLocation: jest.fn(),
    syncToLocation: jest.fn(),
  };

  controller.__setUiState = (nextState) => {
    currentState = nextState || currentState;
  };

  controller.__queueState = (nextState) => {
    if (nextState) {
      queue.push(nextState);
    }
  };

  return controller;
}
