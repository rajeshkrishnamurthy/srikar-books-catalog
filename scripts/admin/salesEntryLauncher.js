export function initSaleEntryLauncher(elements = {}, options = {}) {
  const button = elements.button || null;
  const panel = elements.panel || null;
  const focusTarget = elements.focusTarget || null;
  const searchInput = elements.searchInput || null;

  if (!button || !panel || !focusTarget) {
    console.warn(
      'initSaleEntryLauncher requires button, panel, and focus target elements.'
    );
    return null;
  }

  const startSaleWorkflow =
    typeof options.startSaleWorkflow === 'function' ? options.startSaleWorkflow : () => {};

  const panelId = panel.id || 'saleEntryPanel';
  button.setAttribute('aria-controls', panelId);
  button.setAttribute('aria-expanded', 'false');

  let workflowStarted = false;

  const handleClick = (event) => {
    event?.preventDefault?.();
    activateLauncher();
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    activateLauncher();
  };

  button.addEventListener('click', handleClick);
  button.addEventListener('keydown', handleKeyDown);

  return {
    dispose() {
      button.removeEventListener('click', handleClick);
      button.removeEventListener('keydown', handleKeyDown);
    },
  };

  function activateLauncher() {
    if (!workflowStarted) {
      startSaleWorkflow();
      workflowStarted = true;
    }
    openPanel();
  }

  function openPanel() {
    panel.removeAttribute('hidden');
    panel.open = true;
    panel.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    button.setAttribute('aria-expanded', 'true');
    focusTarget.focus?.();
    searchInput?.setAttribute?.('aria-describedby', panel.id);
  }
}
