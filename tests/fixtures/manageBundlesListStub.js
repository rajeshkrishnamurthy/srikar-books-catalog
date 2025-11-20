import { jest } from '@jest/globals';

function normalizeControl(control) {
  if (!control) {
    return null;
  }
  if (typeof control === 'string') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = control;
    return wrapper;
  }
  if (control instanceof globalThis.Node) {
    return control;
  }
  return null;
}

export function buildBundleListDomStub() {
  return jest.fn((elements = {}, dependencies = {}) => {
    const { resultsEl } = elements;
    const { renderPublishControls } = dependencies;
    return {
      dispose: jest.fn(),
      setSuppliers: jest.fn(),
      setError: jest.fn(),
      setBundles: jest.fn((bundles = []) => {
        if (!resultsEl) {
          return;
        }
        resultsEl.innerHTML = '';
        bundles.forEach((bundle) => {
          const row = document.createElement('div');
          row.className = 'bundle-row';
          const actions = document.createElement('div');
          actions.className = 'bundle-row__actions';
          const controls =
            typeof renderPublishControls === 'function'
              ? renderPublishControls(bundle)
              : null;
          const normalized = normalizeControl(controls);
          if (normalized) {
            actions.appendChild(normalized);
          }
          row.appendChild(actions);
          resultsEl.appendChild(row);
        });
      }),
    };
  });
}

export function buildBundleListMutationStub(inlinePayload = {}) {
  return jest.fn((elements = {}, dependencies = {}) => {
    const api = {
      dispose: jest.fn(),
      setSuppliers: jest.fn(),
      setBundles: jest.fn(),
      setError: jest.fn(),
      simulateInlineEdit() {
        if (typeof dependencies.onBundleMutation === 'function') {
          dependencies.onBundleMutation({
            id: inlinePayload.id || 'bundle-inline',
            type: inlinePayload.type || 'edit',
          });
        }
      },
    };
    return api;
  });
}
