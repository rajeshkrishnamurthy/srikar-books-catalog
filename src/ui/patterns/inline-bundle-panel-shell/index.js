const FALLBACK_API = {
  addBook() {},
  reset() {},
  destroy() {},
};

const DEFAULT_UI_TEXTS = {
  panelTitle: '',
  emptyState: '',
  saveLabel: '',
  resetLabel: '',
};

const CHIP_CLASS = 'inline-bundle-chip';
const CHIP_LABEL_CLASS = `${CHIP_CLASS}__label`;
const CHIP_REMOVE_CLASS = `${CHIP_CLASS}__remove`;
const CHIP_REMOVE_TEST_ID = 'inlineBundleRemove';

function escapeAttrValue(value = '') {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return String(value).replace(/(["\\])/g, '\\$1');
}

const isElement = (node) =>
  node && typeof node === 'object' && node.nodeType === 1 && typeof node.nodeName === 'string';

function resolveElement(ref, { within, documentRef } = {}) {
  if (!ref) return null;
  if (isElement(ref)) {
    return ref;
  }
  if (typeof ref === 'string') {
    const scope = isElement(within) ? within : documentRef || (typeof document !== 'undefined' ? document : null);
    return scope?.querySelector?.(ref) || null;
  }
  return null;
}

function createChip(docRef, book = {}, handleRemove) {
  const el = docRef.createElement('div');
  el.className = CHIP_CLASS;
  el.setAttribute('role', 'listitem');

  const label = docRef.createElement('span');
  label.className = CHIP_LABEL_CLASS;
  label.textContent = book.title || '';
  el.appendChild(label);

  const removeButton = docRef.createElement('button');
  removeButton.type = 'button';
  removeButton.className = CHIP_REMOVE_CLASS;
  removeButton.dataset.test = CHIP_REMOVE_TEST_ID;
  if (book.id) {
    removeButton.dataset.bookId = book.id;
  }
  const titleText = book.title || 'selected book';
  removeButton.setAttribute('aria-label', `Remove ${titleText} from bundle`);
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', (event) => {
    event?.preventDefault?.();
    handleRemove?.();
  });
  el.appendChild(removeButton);

  return { chip: el, removeButton };
}

function deriveBookId(book = {}, triggerButton) {
  const directId = book?.id;
  if (directId && typeof directId === 'string') {
    return directId;
  }
  if (directId && typeof directId === 'number') {
    return String(directId);
  }
  const row = triggerButton?.closest?.('[data-id]');
  const fallbackId = row?.dataset?.id;
  return fallbackId || null;
}

function deriveBookTitle({ book = {}, triggerButton }) {
  const baseTitle = (book.title || '').trim();
  if (baseTitle) return baseTitle;
  const rowTitle =
    triggerButton
      ?.closest?.('.row')
      ?.querySelector?.('strong')
      ?.textContent?.trim() || '';
  if (rowTitle) return rowTitle;
  return 'Untitled bundle book';
}

function focusElement(element) {
  if (!element || typeof element.focus !== 'function') return;
  const focusTarget = () => {
    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }
  };
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(focusTarget);
  } else {
    setTimeout(focusTarget, 0);
  }
}

export function mount(container, config = {}) {
  const { params = {}, adapters = {}, uiTexts = {}, options = {} } = config;
  const autoShowOnAdd = options.autoShowOnAdd !== false;
  const doc = container?.ownerDocument || params.container?.ownerDocument || document;
  const defaultView = doc?.defaultView || (typeof window !== 'undefined' ? window : null);
  const selectionCallbacks = options?.selectionCallbacks || {};
  const root = isElement(container)
    ? container
    : resolveElement(params.container, { documentRef: doc });

  const heading = resolveElement(params.panelHeading, { within: root, documentRef: doc });
  const bookList = resolveElement(params.bookList, { within: root, documentRef: doc });
  const emptyState = resolveElement(params.emptyState, { within: root, documentRef: doc });
  const resetButton = resolveElement(params.resetButton, { within: root, documentRef: doc });
  const closeButton = resolveElement(params.closeButton, { within: root, documentRef: doc });

  if (!root || !heading || !bookList || !emptyState) {
    return FALLBACK_API;
  }

  const saveButton = resolveElement(params.saveButton, { within: root, documentRef: doc });
  const uiTextConfig = { ...DEFAULT_UI_TEXTS, ...uiTexts };

  if (uiTextConfig.panelTitle && heading.textContent !== uiTextConfig.panelTitle) {
    heading.textContent = uiTextConfig.panelTitle;
  }
  if (uiTextConfig.emptyState && emptyState.textContent !== uiTextConfig.emptyState) {
    emptyState.textContent = uiTextConfig.emptyState;
  }
  if (uiTextConfig.saveLabel && saveButton) {
    saveButton.textContent = uiTextConfig.saveLabel;
  }
  if (uiTextConfig.resetLabel && resetButton) {
    resetButton.textContent = uiTextConfig.resetLabel;
  }

  const state = {
    books: [],
    activeTrigger: null,
  };

  const showComposer = () => {
    root.hidden = false;
  };

  const hideComposer = () => {
    root.hidden = true;
  };

  const renderList = () => {
    bookList.textContent = '';
    state.books.forEach((book, index) => {
      const { chip } = createChip(doc, book, () => removeBookAtIndex(index));
      bookList.appendChild(chip);
    });
    if (state.books.length === 0) {
      emptyState.removeAttribute('hidden');
      bookList.hidden = true;
    } else {
      emptyState.setAttribute('hidden', '');
      bookList.hidden = false;
    }
  };

  const focusHeading = () => focusElement(heading);
  const focusTrigger = (trigger) => focusElement(trigger);

  const setTriggerState = (trigger) => {
    if (state.activeTrigger && state.activeTrigger !== trigger) {
      state.activeTrigger.setAttribute('aria-pressed', 'false');
      state.activeTrigger.setAttribute('aria-expanded', 'false');
    }
    if (trigger) {
      trigger.setAttribute('aria-pressed', 'true');
      trigger.setAttribute('aria-expanded', 'true');
      state.activeTrigger = trigger;
    }
  };

  const closeComposer = () => {
    hideComposer();
    if (state.activeTrigger) {
      state.activeTrigger.setAttribute('aria-expanded', 'false');
      focusTrigger(state.activeTrigger);
    }
  };

  const announce = typeof adapters.announce === 'function' ? adapters.announce : null;
  const getRemoveButtonForBookId = (bookId) => {
    if (!bookId || !bookList) return null;
    const selector = `[data-test='${CHIP_REMOVE_TEST_ID}'][data-book-id="${escapeAttrValue(
      bookId
    )}"]`;
    return bookList.querySelector(selector);
  };

  const collapseAfterEmpty = ({ focusTarget } = {}) => {
    hideComposer();
    const target = focusTarget || state.activeTrigger;
    if (state.activeTrigger) {
      state.activeTrigger.setAttribute('aria-pressed', 'false');
      state.activeTrigger.setAttribute('aria-expanded', 'false');
    }
    state.activeTrigger = null;
    focusTrigger(target);
  };

  const removeBookAtIndex = (index) => {
    if (!Array.isArray(state.books) || index < 0 || index >= state.books.length) return;
    const [removed] = state.books.splice(index, 1);
    const removedTitle = removed?.title || 'selected book';
    renderList();
    if (state.books.length === 0) {
      collapseAfterEmpty({ focusTarget: state.activeTrigger });
    } else {
      const nextEntry = state.books[index] || state.books[state.books.length - 1];
      if (nextEntry?.id) {
        const nextButton = getRemoveButtonForBookId(nextEntry.id);
        focusElement(nextButton);
      }
    }
    if (announce) {
      announce(`Removed ${removedTitle} from bundle`, 'polite');
    }
    if (typeof selectionCallbacks.onRemoveBook === 'function') {
      selectionCallbacks.onRemoveBook(removed);
    }
  };

  const addBook = (book = {}, triggerButton) => {
    if (!book) return;
    const bookId = deriveBookId(book, triggerButton);
    if (!bookId) return;
    const normalizedTitle = deriveBookTitle({ book, triggerButton });
    if (!state.books.some((entry) => entry.id === bookId)) {
      state.books.push({ id: bookId, title: normalizedTitle });
    }
    if (autoShowOnAdd) {
      showComposer();
      focusHeading();
    }
    setTriggerState(triggerButton);
    renderList();
    if (announce) {
      announce(`Added ${normalizedTitle} to bundle`, 'polite');
    }
    if (typeof selectionCallbacks.onAddBook === 'function') {
      selectionCallbacks.onAddBook({ id: bookId, title: normalizedTitle, ...book });
    }
  };

  const reset = () => {
    const lastTrigger = state.activeTrigger;
    state.books = [];
    renderList();
    collapseAfterEmpty({ focusTarget: lastTrigger });
    if (announce) {
      announce('Cleared inline bundle composer', 'polite');
    }
    if (typeof selectionCallbacks.onReset === 'function') {
      selectionCallbacks.onReset();
    }
  };

  const shouldConfirmReset = () => {
    if (state.books.length <= 1) {
      return true;
    }
    if (!defaultView || typeof defaultView.confirm !== 'function') {
      return true;
    }
    const message = `Clear bundle and remove ${state.books.length} selected books?`;
    return defaultView.confirm(message);
  };

  const resetHandler = (event) => {
    event?.preventDefault?.();
    if (!shouldConfirmReset()) return;
    reset();
  };
  const closeHandler = (event) => {
    event?.preventDefault?.();
    closeComposer();
  };
  resetButton?.addEventListener('click', resetHandler);
  closeButton?.addEventListener('click', closeHandler);

  renderList();

  return {
    addBook,
    reset,
    destroy() {
      resetButton?.removeEventListener('click', resetHandler);
      closeButton?.removeEventListener('click', closeHandler);
      state.books = [];
      state.activeTrigger = null;
    },
  };
}
