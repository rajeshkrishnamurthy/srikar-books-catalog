import { compactText } from '../helpers/text.js';

export function initBundleStatusPanel(
  { form, statusToggle, statusChip, msgEl, immutableFields = [] } = {},
  { firebase, bundleId } = {}
) {
  if (!form || !statusToggle || !statusChip) {
    console.warn('bundle status panel requires form, toggle control, and status chip.');
    return null;
  }
  if (!firebase || !bundleId) {
    console.warn('bundle status panel requires firebase dependencies and bundleId.');
    return null;
  }
  const { db, doc, updateDoc } = firebase;
  const docRef = doc(db, 'bundles', bundleId);

  const handlers = [];
  let isUpdating = false;

  const toggleHandler = () => {
    const targetStatus = statusToggle.checked ? 'Published' : 'Draft';
    updateStatus(targetStatus);
  };
  statusToggle.addEventListener('change', toggleHandler);
  handlers.push(() => statusToggle.removeEventListener('change', toggleHandler));

  form.addEventListener('submit', preventSubmit);
  handlers.push(() => form.removeEventListener('submit', preventSubmit));

  syncToggleState(form.dataset.bundleStatus || statusChip.dataset.status || 'Draft');

  return {
    dispose() {
      handlers.forEach((fn) => {
        try {
          fn();
        } catch (error) {
          console.error('bundle status cleanup failed', error);
        }
      });
    },
  };

  async function updateStatus(status) {
    if (isUpdating) return;
    isUpdating = true;
    const previousStatus = form.dataset.bundleStatus || statusChip.dataset.status || 'Draft';
    setBusyState(true, status);
    setMessage(
      status === 'Published' ? 'Publishing bundle…' : 'Unpublishing bundle…',
      false
    );
    try {
      await updateDoc(docRef, { status });
      form.dataset.bundleStatus = status;
      statusChip.dataset.status = status;
      statusChip.textContent = `Status: ${status}`;
      syncToggleState(status);
      setMessage(`Bundle marked as ${status}.`, false);
    } catch (error) {
      console.error('bundle status update failed', error);
      setMessage('Could not update bundle status. Try again.', true);
      syncToggleState(previousStatus);
    } finally {
      isUpdating = false;
      setBusyState(false);
    }
  }

  function preventSubmit(event) {
    event.preventDefault();
    immutableFields.forEach((field) => {
      if (field) {
        field.value = field.dataset.originalValue || field.value;
      }
    });
    setMessage('Bundle content is immutable. Publishing controls only.', true);
  }

  function setMessage(text = '', isError = false) {
    if (!msgEl) return;
    msgEl.textContent = compactText(text);
    msgEl.classList.toggle('error', !!isError && text);
  }

  function syncToggleState(status = form.dataset.bundleStatus || 'Draft') {
    const normalized = status || 'Draft';
    const isPublished = normalized === 'Published';
    statusToggle.checked = isPublished;
    statusToggle.setAttribute('aria-checked', String(isPublished));
    const stateLabel = form.querySelector('.bundle-toggle__state');
    if (stateLabel) {
      stateLabel.textContent = isPublished
        ? stateLabel.dataset.published || 'Published'
        : stateLabel.dataset.draft || 'Draft';
    }
  }

  function setBusyState(isBusy, targetStatus = 'Draft') {
    statusToggle.disabled = isBusy;
    if (isBusy) {
      statusChip.dataset.busy = 'true';
      statusChip.textContent =
        targetStatus === 'Published' ? 'Publishing…' : 'Unpublishing…';
      statusChip.classList.add('is-busy');
    } else {
      statusChip.dataset.busy = '';
      statusChip.classList.remove('is-busy');
      syncToggleState(form.dataset.bundleStatus || statusChip.dataset.status || 'Draft');
    }
  }
}
