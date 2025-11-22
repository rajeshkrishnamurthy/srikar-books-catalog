const DEFAULT_TEMPLATE = '{count}';

function toArray(list) {
  if (!list) return [];
  return Array.isArray(list) ? list : Array.from(list);
}

function hideBadge(badge, zeroHiddenClass) {
  if (!badge) return;
  badge.hidden = true;
  badge.textContent = '';
  if (zeroHiddenClass) {
    badge.classList.add(zeroHiddenClass);
  }
}

function showBadge(badge, text, zeroHiddenClass) {
  if (!badge) return;
  badge.hidden = false;
  badge.textContent = text ?? '';
  if (zeroHiddenClass) {
    badge.classList.remove(zeroHiddenClass);
  }
}

function buildBadgeMap(items, badgeSelector, itemIdAttr, zeroHiddenClass) {
  const badgesById = {};

  items.forEach((item) => {
    const id = item?.getAttribute?.(itemIdAttr);
    if (!id) return;

    const badge = item.querySelector?.(badgeSelector);
    if (!badge) return;

    hideBadge(badge, zeroHiddenClass);
    badgesById[id] = badge;
  });

  return badgesById;
}

function formatLabel(count, adapters, template) {
  const formatter = adapters.formatCount;
  const base = typeof formatter === 'function' ? formatter(count) : count;
  const safeTemplate = template || DEFAULT_TEMPLATE;

  if (typeof safeTemplate === 'string' && safeTemplate.includes('{count}')) {
    return String(safeTemplate.replace('{count}', base));
  }

  return String(base ?? '');
}

async function mountMembershipCountBadge(options = {}) {
  const params = options.params || {};
  const adapters = options.adapters || {};
  const uiTexts = options.uiTexts || {};

  const { itemSelector, badgeSelector, itemIdAttr } = params;
  if (!itemSelector || !badgeSelector || !itemIdAttr) {
    throw new Error('membership count badge params missing');
  }

  const items = toArray(document.querySelectorAll(itemSelector));
  if (!items.length) {
    throw new Error('membership count badge anchors missing');
  }

  const zeroHiddenClass = params.zeroHiddenClass;
  const badgesById = buildBadgeMap(items, badgeSelector, itemIdAttr, zeroHiddenClass);
  if (!Object.keys(badgesById).length) {
    throw new Error('membership badges missing');
  }

  async function sync(ids = []) {
    const safeIds = Array.isArray(ids) ? ids : [];
    const template = params.countLabelTemplate || uiTexts.countLabelTemplate || DEFAULT_TEMPLATE;
    const politeness = params.announcePoliteness || uiTexts.announcePoliteness || 'polite';

    const countsResult =
      typeof adapters.fetchCounts === 'function' ? await adapters.fetchCounts({ ids: safeIds }) : {};
    const counts = countsResult && typeof countsResult === 'object' ? countsResult : {};

    Object.entries(badgesById).forEach(([id, badge]) => {
      const count = counts[id];
      const shouldShow = safeIds.includes(id) && typeof count === 'number' && count > 0;

      if (shouldShow) {
        const label = formatLabel(count, adapters, template);
        showBadge(badge, label, zeroHiddenClass);

        if (typeof adapters.announce === 'function') {
          adapters.announce(label, politeness);
        }
      } else {
        hideBadge(badge, zeroHiddenClass);
      }
    });
  }

  function destroy() {
    Object.values(badgesById).forEach((badge) => hideBadge(badge, zeroHiddenClass));
  }

  return { sync, destroy };
}

export { mountMembershipCountBadge, mountMembershipCountBadge as mount };
export default mountMembershipCountBadge;
