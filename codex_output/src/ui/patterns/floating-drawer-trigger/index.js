const DEFAULT_OFFSET = { x: 16, y: 16 };

function resolveElement(ref, root = document) {
  if (!ref) return null;
  if (typeof ref === 'string') return root.querySelector(ref);
  return ref;
}

function applyPosition(trigger, params = {}) {
  if (!trigger || !trigger.style) return;

  const offset = params.offset || DEFAULT_OFFSET;
  const safePad = params.safeAreaPadding || 0;
  const position = params.position || 'bottom-right';

  trigger.style.position = 'fixed';
  trigger.style.bottom = `${(offset.y || 0) + safePad}px`;

  if (position === 'bottom-left') {
    trigger.style.left = `${(offset.x || 0) + safePad}px`;
    trigger.style.right = 'auto';
  } else {
    trigger.style.right = `${(offset.x || 0) + safePad}px`;
    trigger.style.left = 'auto';
  }

  if (params.zIndex != null) {
    trigger.style.zIndex = String(params.zIndex);
  }
}

async function mountFloatingDrawerTrigger(options = {}) {
  const params = options.params || {};
  const adapters = options.adapters || {};

  const resolvedContainer =
    typeof params.container === 'string' ? document.querySelector(params.container) : params.container;
  const root = resolvedContainer || document;
  const trigger = resolveElement(params.trigger || '#floatingDrawerTrigger', root);
  const badge = resolveElement(params.badge || '#floatingDrawerBadge', root);

  if (!trigger || !badge) {
    throw new Error('floating drawer trigger anchors missing');
  }

  if (params.ariaLabel) {
    trigger.setAttribute('aria-label', params.ariaLabel);
  }

  applyPosition(trigger, params);

  const maxCount = Number.isFinite(params.maxCount) ? params.maxCount : 99;
  let currentCount = 0;

  function hideTrigger() {
    trigger.hidden = true;
    trigger.setAttribute('aria-hidden', 'true');
    trigger.style.visibility = 'hidden';
    badge.textContent = '';
  }

  function showTrigger() {
    trigger.hidden = false;
    trigger.removeAttribute('aria-hidden');
    trigger.style.visibility = 'visible';
    if (trigger.style.display === 'none') {
      trigger.style.display = '';
    }
  }

  function renderCount(countValue) {
    const safeCount = typeof countValue === 'number' ? countValue : 0;
    currentCount = safeCount;

    if (safeCount <= 0) {
      hideTrigger();
      return;
    }

    const text = safeCount > maxCount ? `${maxCount}+` : String(safeCount);
    badge.textContent = text;
    showTrigger();
  }

  function handleClick(event) {
    if (event?.preventDefault) {
      event.preventDefault();
    }

    if (typeof adapters.applyAnimation === 'function') {
      adapters.applyAnimation({ isOpening: true, count: currentCount });
    }

    if (params.animationClass) {
      trigger.classList.add(params.animationClass);
    }

    if (typeof adapters.openDrawer === 'function') {
      adapters.openDrawer();
    }
  }

  trigger.addEventListener('click', handleClick);

  const initialCount =
    typeof adapters.getCount === 'function' ? await Promise.resolve(adapters.getCount()) : 0;
  renderCount(initialCount);

  return {
    syncCount(nextCount) {
      renderCount(nextCount);
    },
    destroy() {
      trigger.removeEventListener('click', handleClick);
      hideTrigger();
    }
  };
}

export { mountFloatingDrawerTrigger, mountFloatingDrawerTrigger as mount };
export default mountFloatingDrawerTrigger;
