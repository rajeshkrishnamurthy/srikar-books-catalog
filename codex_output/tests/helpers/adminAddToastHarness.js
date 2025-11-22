import { jest } from '@jest/globals';
import { createAdminAddHarness } from '../../../tests/fixtures/adminAddHarness.js';

const DEFAULT_TOAST_DURATION_MS = 5000;

function ensureToastAnchors() {
  const existingStack = document.getElementById('toastStack');
  const existingLiveRegion = document.getElementById('toastLiveRegion');
  const existingTemplate = document.getElementById('toastTemplate');

  const toastStack = existingStack || document.createElement('div');
  const toastLiveRegion = existingLiveRegion || document.createElement('div');
  const toastTemplate = existingTemplate || document.createElement('template');

  const createdStack = !existingStack;
  const createdLive = !existingLiveRegion;
  const createdTemplate = !existingTemplate;

  toastStack.id = 'toastStack';
  toastStack.setAttribute('data-test', 'toastStack');
  toastStack.setAttribute('aria-live', 'off');

  toastLiveRegion.id = 'toastLiveRegion';
  toastLiveRegion.setAttribute('role', 'status');
  toastLiveRegion.setAttribute('aria-live', 'polite');
  toastLiveRegion.setAttribute('aria-atomic', 'true');

  toastTemplate.id = 'toastTemplate';
  if (!toastTemplate.innerHTML.trim()) {
    toastTemplate.innerHTML = `
      <div class="toast" role="status" data-toast="true" data-toast-id="">
        <p data-slot="message"></p>
        <button type="button" data-slot="dismiss" aria-label="Dismiss toast">Dismiss</button>
      </div>
    `;
  }

  if (createdStack) {
    document.body.appendChild(toastStack);
  }
  if (createdLive) {
    document.body.appendChild(toastLiveRegion);
  }
  if (createdTemplate) {
    document.body.appendChild(toastTemplate);
  }

  const announceToast = jest.fn((message = '', politeness = 'polite') => {
    toastLiveRegion.setAttribute('aria-live', politeness);
    toastLiveRegion.textContent = message;
  });
  const onToastShow = jest.fn();
  const onToastDismiss = jest.fn();

  return {
    toastStack,
    toastLiveRegion,
    toastTemplate,
    createdStack,
    createdLive,
    createdTemplate,
    announceToast,
    onToastShow,
    onToastDismiss,
  };
}

function createToastStub({
  toastStack,
  toastLiveRegion,
  toastTemplate,
  announceToast,
  onToastShow,
  onToastDismiss,
}) {
  const timers = new Set();

  const showToast = jest.fn((payload = {}) => {
    const { message = '', variant = 'success', pin = false } = payload || {};
    const id =
      payload?.id ||
      `toast-${Date.now()}-${toastStack.children.length + 1}`;

    const templateContent = toastTemplate.content;
    const toastEl = templateContent?.firstElementChild
      ? templateContent.firstElementChild.cloneNode(true)
      : document.createElement('div');

    toastEl.dataset.toastId = id;
    toastEl.dataset.variant = variant;
    toastEl.setAttribute('role', toastEl.getAttribute('role') || 'status');

    const messageNode =
      toastEl.querySelector('[data-slot="message"]') || toastEl;
    messageNode.textContent = message || 'Book added';

    const dismiss = () => {
      onToastDismiss?.(payload);
      toastEl.remove();
    };

    const dismissButton = toastEl.querySelector('[data-slot="dismiss"]');
    if (dismissButton) {
      dismissButton.addEventListener('click', dismiss);
    }
    toastEl.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        dismiss();
      }
    });

    toastStack.appendChild(toastEl);
    announceToast?.(message, 'polite');
    onToastShow?.(payload);

    if (!pin) {
      const timer = setTimeout(dismiss, DEFAULT_TOAST_DURATION_MS);
      timers.add(timer);
    }

    return id;
  });

  showToast.dismissAll = () => {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
    toastStack.innerHTML = '';
    toastLiveRegion.textContent = '';
  };

  return showToast;
}

export async function createAddBookToastHarness(options = {}) {
  const { firebaseOverrides = {}, formDefaults = {} } = options;

  const harness = await createAdminAddHarness({
    firebaseOverrides,
    formDefaults,
  });

  const anchors = ensureToastAnchors();
  const showToast = createToastStub(anchors);

  globalThis.showToast = showToast;
  globalThis.announceToast = anchors.announceToast;
  globalThis.onToastShow = anchors.onToastShow;
  globalThis.onToastDismiss = anchors.onToastDismiss;

  return {
    ...harness,
    ...anchors,
    showToast,
    cleanup() {
      showToast.dismissAll?.();
      delete globalThis.showToast;
      delete globalThis.announceToast;
      delete globalThis.onToastShow;
      delete globalThis.onToastDismiss;
      if (anchors.createdStack) anchors.toastStack.remove();
      if (anchors.createdLive) anchors.toastLiveRegion.remove();
      if (anchors.createdTemplate) anchors.toastTemplate.remove();
    },
  };
}
