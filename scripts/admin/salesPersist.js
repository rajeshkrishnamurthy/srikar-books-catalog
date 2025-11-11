const DEFAULT_STATUS = 'pending';

export function initSalePersist(elements = {}, options = {}) {
  const refs = {
    submitBtn: elements.submitBtn || null,
    msgEl: elements.msgEl || null,
    lineStatusList: elements.lineStatusList || null,
  };

  const deps = {
    db: options.db || {},
    collection: options.collection || (() => null),
    addDoc: options.addDoc || (() => Promise.resolve({ id: null })),
    serverTimestamp: options.serverTimestamp || (() => new Date()),
    getHeaderPayload: options.getHeaderPayload || (() => null),
    getLineItems: options.getLineItems || (() => []),
    formatCurrency:
      options.formatCurrency || ((value) => `₹${Number(value || 0).toFixed(2)}`),
    onPersisted: typeof options.onPersisted === 'function' ? options.onPersisted : () => {},
  };

  if (!refs.submitBtn) {
    console.warn('initSalePersist requires a submit button reference.');
    return null;
  }

  const state = {
    busy: false,
  };

  const handleClick = async (event) => {
    event?.preventDefault?.();
    if (state.busy) return;
    await persistSale();
  };
  refs.submitBtn.addEventListener('click', handleClick);

  return {
    dispose() {
      refs.submitBtn.removeEventListener('click', handleClick);
    },
  };

  async function persistSale() {
    const header = deps.getHeaderPayload();
    if (!header) {
      setMessage('Sale header is missing. Select a customer and date before saving.');
      return;
    }
    const lines = deps.getLineItems();
    if (!lines || !lines.length) {
      setMessage('Add at least one line item before saving.');
      return;
    }

    state.busy = true;
    refs.submitBtn.disabled = true;
    clearMessage();
    clearLineStatuses();

    const doc = buildSaleDocument({
      header,
      lines,
      serverTimestamp: deps.serverTimestamp,
    });

    const salesCollection = deps.collection(deps.db, 'sales');

    try {
      const result = await deps.addDoc(salesCollection, doc);
      renderLineStatuses(lines.map(cloneLine), 'success');
      setMessage('Sale saved successfully.');
      deps.onPersisted({
        saleId: result?.id || null,
        document: doc,
      });
    } catch (error) {
      renderLineStatuses(lines.map(cloneLine), 'error', error);
      setMessage(`Sale failed: ${error?.message || 'unknown error'}`);
    } finally {
      state.busy = false;
      refs.submitBtn.disabled = false;
    }
  }

  function setMessage(text) {
    if (!refs.msgEl) return;
    refs.msgEl.textContent = text || '';
  }

  function clearMessage() {
    setMessage('');
  }

  function clearLineStatuses() {
    if (!refs.lineStatusList) return;
    refs.lineStatusList.innerHTML = '';
  }

function renderLineStatuses(lines, state, error) {
    if (!refs.lineStatusList) return;
    clearLineStatuses();
    lines.forEach((line, index) => {
      const item = refs.lineStatusList.ownerDocument.createElement('li');
      item.dataset.state = state;
      if (state === 'success') {
        item.textContent = `${line.bookTitle || `Line ${index + 1}`} Saved — ${deps.formatCurrency(
          line.sellingPrice || 0
        )}`;
      } else {
        item.textContent = `${line.bookTitle || `Line ${index + 1}`} Failed — ${
          error?.message || 'Unknown error'
        }`;
      }
      refs.lineStatusList.appendChild(item);
    });
  }
}

export function buildSaleDocument(options = {}) {
  const {
    header = {},
    lines = [],
    serverTimestamp,
    status = DEFAULT_STATUS,
  } = options;
  const submittedAt = resolveTimestamp(serverTimestamp);
  const normalizedLines = Array.isArray(lines) ? [...lines] : [];
  const totals = {
    count: normalizedLines.length,
    amount: normalizedLines.reduce(
      (sum, line) => sum + Number.parseFloat(line.sellingPrice || 0),
      0
    ),
  };
  return {
    header,
    lines: normalizedLines,
    totals,
    submittedAt,
    status,
  };
}

export function updateMarkSoldButtonCopy(root = document) {
  if (!root) return;
  const buttons = root.querySelectorAll('button[data-action="sold"]');
  buttons.forEach((btn) => {
    btn.textContent = 'Out of stock';
  });
}

function resolveTimestamp(factory) {
  if (typeof factory === 'function') {
    return factory();
  }
  return new Date();
}

function cloneLine(line) {
  if (!line || typeof line !== 'object') {
    return {};
  }
  return {
    ...line,
    supplier: line.supplier
      ? {
          ...line.supplier,
        }
      : line.supplier ?? null,
  };
}
