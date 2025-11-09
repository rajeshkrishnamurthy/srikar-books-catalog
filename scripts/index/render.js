// Intent: DOM rendering only; no Firestore calls here.
import { escapeHtml, compactText } from '../helpers/text.js';
import { purchaseMessage, waLink } from '../lib/wa.js';

export function renderBooks({ gridEl, emptyEl, docs, searchTerm }) {
  const term = (searchTerm || '').toLowerCase();
  const filtered = term
    ? docs.filter(b =>
        (b.title || '').toLowerCase().includes(term) ||
        (b.author || '').toLowerCase().includes(term)
      )
    : docs;

  if (!filtered.length) {
    gridEl.innerHTML = '';
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;
  gridEl.innerHTML = filtered.map(bookCardHTML).join('');
}

export function wireTabs(tabButtons, onCategoryChange) {
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active'); btn.setAttribute('aria-selected', 'true');
      onCategoryChange(btn.dataset.category);
    });
  });
}

function bookCardHTML(b) {
  const img = (b.images && b.images[0]) || './assets/placeholder.webp';
  const msg = purchaseMessage(b);
  const wa = waLink(msg);

  const lines = [];
  if (b.condition) lines.push(`<p class="muted">Book condition : ${escapeHtml(b.condition)}</p>`);
  if (b.price != null) lines.push(`<p class="muted">My price : ₹${escapeHtml(String(b.price))}</p>`);
  if (b.mrp   != null) lines.push(`<p class="muted">MRP: ₹${escapeHtml(String(b.mrp))}</p>`);

  const desc = b.description
    ? `<p class="desc">${escapeHtml(compactText(String(b.description)))}</p>`
    : '';

  return `
  <article class="card">
    <img loading="lazy" src="${img}" alt="${escapeHtml(b.title || 'Book cover')}" />
    <div class="meta">
      <h3>${escapeHtml(b.title || 'Untitled')}</h3>
      ${lines.join('')}
      ${desc}
      <a class="btn" href="${wa}" target="_blank" rel="noopener">Message on WhatsApp</a>
    </div>
  </article>`;
}
