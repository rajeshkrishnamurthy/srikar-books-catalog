import { jest } from '@jest/globals';
import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';
import { buildPaginationControllerStub } from '../../fixtures/paginationControllerStub.js';
import {
  buildBundleListMutationStub,
} from '../../fixtures/manageBundlesListStub.js';

describe('SPEC SBD-F21-TP2-003: Inline edits trigger targeted pagination refresh', () => {
  test('bundle list mutation callbacks ask the pagination controller to refresh the same slice', async () => {
    const controller = buildPaginationControllerStub();
    controller.refresh = jest.fn();
    const createPaginationController = jest.fn((config = {}) => {
      controller.__config = config;
      return controller;
    });

    const initBundleList = buildBundleListMutationStub();
    const harness = await createAdminMainHarness({
      manageBundles: { createPaginationController, initBundleList },
    });

    try {
      await harness.simulateSignIn();
      await openManageBundlesTab(harness);

      const bundleListApi = initBundleList.mock.results[0]?.value;
      expect(bundleListApi).toBeTruthy();
      expect(typeof bundleListApi.simulateInlineEdit).toBe('function');

      controller.refresh.mockClear();

      bundleListApi.simulateInlineEdit();

      expect(controller.refresh).toHaveBeenCalledTimes(1);
    } finally {
      harness.cleanup();
    }
  });
});

async function openManageBundlesTab(harness) {
  fireEvent.click(harness.bundlesNavButton);
  const manageTab = document.querySelector(
    '#bundlesSubNav [data-manage-tab="manage"]'
  );
  expect(manageTab).not.toBeNull();
  fireEvent.click(manageTab);
  await Promise.resolve();
}
