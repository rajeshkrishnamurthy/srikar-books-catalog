function ensureContainer(providedContainer) {
  if (providedContainer) return { container: providedContainer, created: false };

  const container = document.createElement('div');
  document.body.appendChild(container);
  return { container, created: true };
}

async function createFloatingDrawerTriggerHarness(options = {}) {
  const { container, created } = ensureContainer(options.container);

  const trigger = options.trigger || document.createElement('button');
  trigger.id = 'floatingDrawerTrigger';
  trigger.type = 'button';
  trigger.hidden = true;

  const icon = document.createElement('span');
  icon.className = options.iconClass || 'material-icons';
  icon.textContent = options.iconText || 'shopping_cart';
  trigger.appendChild(icon);

  const badge = options.badge || document.createElement('span');
  badge.id = 'floatingDrawerBadge';
  trigger.appendChild(badge);

  container.appendChild(trigger);

  const adapters = {
    getCount: jest.fn(() => options.initialCount ?? 0),
    openDrawer: jest.fn(),
    applyAnimation: jest.fn(),
    ...(options.adapters || {})
  };

  const params = {
    container,
    trigger,
    badge,
    maxCount: options.maxCount ?? 99,
    ariaLabel: options.ariaLabel,
    animationClass: options.animationClass,
    ...(options.params || {})
  };

  let importError;
  let mountError;
  let api;
  let mountFloatingDrawerTrigger;

  try {
    // Dynamic import so missing modules surface as importError for RED.
    const required = await import('../../src/ui/patterns/floating-drawer-trigger/index.js');
    mountFloatingDrawerTrigger = required?.default || required?.mountFloatingDrawerTrigger || required?.mount;
  } catch (error) {
    importError = error;
  }

  if (!importError) {
    if (typeof mountFloatingDrawerTrigger === 'function') {
      try {
        api = await mountFloatingDrawerTrigger({
          params,
          adapters,
          options: options.options || {}
        });
      } catch (error) {
        mountError = error;
      }
    } else {
      mountError = new Error('mountFloatingDrawerTrigger export missing');
    }
  }

  function cleanup() {
    trigger.remove();
    if (badge.parentElement === trigger) {
      badge.remove();
    }
    if (created && container.parentElement) {
      container.remove();
    }
  }

  return { container, trigger, badge, icon, adapters, params, importError, mountError, api, cleanup };
}

module.exports = {
  createFloatingDrawerTriggerHarness
};
