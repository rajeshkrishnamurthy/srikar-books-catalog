import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';

const moduleUrl = new URL('../../scripts/admin/bundleStatus.js', import.meta.url);

export async function createBundleStatusHarness(bundleOverrides = {}) {
  const bundle = {
    id: 'bundle-1',
    title: 'Starter Kit',
    status: 'Draft',
    price: 275,
    ...bundleOverrides,
  };

  jest.resetModules();
  jest.clearAllMocks();

  const firebase = buildFirebaseMocks();
  globalThis.__firebaseMocks = firebase;

  const dom = buildDom(bundle);

  const { initBundleStatusPanel } = await import(moduleUrl.href);

  const api = initBundleStatusPanel(
    {
      form: dom.form,
      statusToggle: dom.statusToggle,
      statusChip: dom.statusChip,
      msgEl: dom.msgEl,
      immutableFields: [dom.titleInput, dom.priceInput],
    },
    {
      firebase: firebase.exports,
      bundleId: bundle.id,
    }
  );

  async function changeToggle(value) {
    dom.statusToggle.checked = value;
    fireEvent.change(dom.statusToggle);
    await flushPromises();
  }

  return {
    ...dom,
    mocks: firebase.mocks,
    api,
    setField(name, value) {
      const map = {
        title: dom.titleInput,
        price: dom.priceInput,
      };
      if (map[name]) {
        map[name].value = value;
        map[name].dispatchEvent(new Event('input', { bubbles: true }));
      }
    },
    async publish() {
      await changeToggle(true);
    },
    async unpublish() {
      await changeToggle(false);
    },
    async submit() {
      fireEvent.submit(dom.form);
      await flushPromises();
    },
    updateStatusDataset(status) {
      dom.form.dataset.bundleStatus = status;
    },
  };
}

function buildDom(bundle) {
  document.body.innerHTML = `
    <section>
      <div id="bundleStatusChip" data-status="${bundle.status}">${bundle.status}</div>
      <form id="bundleDetailForm" data-bundle-status="${bundle.status}">
        <label>
          Title
          <input id="bundleTitle" value="${bundle.title}" />
        </label>
        <label>
          Bundle price
          <input id="bundlePrice" value="${bundle.price}" />
        </label>
        <div class="bundle-actions">
          <label>
            Publish bundle
            <input id="bundlePublishToggle" type="checkbox" ${bundle.status === 'Published' ? 'checked' : ''} />
          </label>
        </div>
      </form>
      <p id="bundleStatusMsg"></p>
    </section>
  `;

  return {
    form: document.getElementById('bundleDetailForm'),
    statusToggle: document.getElementById('bundlePublishToggle'),
    statusChip: document.getElementById('bundleStatusChip'),
    msgEl: document.getElementById('bundleStatusMsg'),
    titleInput: document.getElementById('bundleTitle'),
    priceInput: document.getElementById('bundlePrice'),
  };
}

function buildFirebaseMocks() {
  const updateDoc = jest.fn().mockResolvedValue();
  const doc = jest.fn((db, collection, id) => ({ path: `${collection}/${id}` }));
  const exports = {
    db: {},
    doc,
    updateDoc,
  };
  return {
    exports,
    mocks: {
      updateDoc,
      doc,
    },
  };
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
