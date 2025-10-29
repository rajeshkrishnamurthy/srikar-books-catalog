// scripts/admin/lookup.js
// Intent: Results list for "Find details (ISBN/MRP)" with:
// - Reliability badges + source pill in result cards
// - Stepwise progress UI on "Use this": Queuing selection → Fetching metadata → Downloading cover
// - INR-by-ISBN cache (no redundant fetch), bounded concurrency, soft-fail messaging

import { stripHtmlAndSquash } from '../helpers/text.js';

/* ----------------------------- caches & utilities ----------------------------- */

const isbnPriceCache = new Map(); // isbn -> number | Symbol('no-inr')
const ISBN_NOT_FOUND = Symbol('no-inr');

async function mapLimit(items, limit, iter) {
  const q = [...items];
  const workers = Array.from(
    { length: Math.min(limit, q.length) },
    async () => {
      while (q.length) await iter(q.shift());
    }
  );
  await Promise.allSettled(workers);
}

function bestGoogleImage(links = {}) {
  return (
    links.extraLarge ||
    links.large ||
    links.medium ||
    links.small ||
    links.thumbnail ||
    links.smallThumbnail ||
    ''
  );
}
function upgradeGoogleThumb(url = '') {
  if (!url) return '';
  return url
    .replace(/^http:/, 'https:')
    .replace('zoom=1', 'zoom=2')
    .replace(/&?edge=curl/g, '');
}

async function setCoverFromUrl(url, coverInput, title = 'cover') {
  if (!url) return false;
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) return false;
    const blob = await r.blob();
    if (!/^image\//.test(blob.type)) return false;
    const ext = (blob.type.split('/')[1] || 'jpg').toLowerCase();
    const safe = (title || 'cover')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 50);
    const file = new File([blob], `${safe}.${ext}`, { type: blob.type });
    const dt = new DataTransfer();
    dt.items.add(file);
    coverInput.files = dt.files;
    try {
      coverInput.dispatchEvent(new Event('change', { bubbles: true }));
    } catch {}
    return true;
  } catch {
    return false;
  }
}

function olIsbnCoverUrls(isbn) {
  return isbn
    ? [
        `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,
        `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`,
      ]
    : [];
}
async function olCoverByTitleAuthor(title, author) {
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(
    title || ''
  )}${author ? `&author=${encodeURIComponent(author)}` : ''}&limit=1`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const id = data?.docs?.[0]?.cover_i;
    return id
      ? [
          `https://covers.openlibrary.org/b/id/${id}-L.jpg`,
          `https://covers.openlibrary.org/b/id/${id}-M.jpg`,
        ]
      : [];
  } catch {
    return [];
  }
}
async function prefillCoverFromCandidates(candidates, coverInput, title) {
  for (const u of candidates) {
    if (await setCoverFromUrl(u, coverInput, title)) return true;
  }
  return false;
}

/* ----------------------------- INR lookups by ISBN ---------------------------- */

async function findINRPriceByISBN(isbn, apiKey = '') {
  if (!isbn) return null;

  if (isbnPriceCache.has(isbn)) {
    const v = isbnPriceCache.get(isbn);
    return v === ISBN_NOT_FOUND ? null : v;
  }

  const key = apiKey ? `&key=${apiKey}` : '';
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(
    isbn
  )}&printType=books&country=IN${key}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = data?.items || [];
    for (const v of items) {
      const lp = v?.saleInfo?.listPrice;
      const rp = v?.saleInfo?.retailPrice;
      if (lp?.currencyCode === 'INR') {
        const amt = Math.round(lp.amount);
        isbnPriceCache.set(isbn, amt);
        return amt;
      }
      if (rp?.currencyCode === 'INR') {
        const amt = Math.round(rp.amount);
        isbnPriceCache.set(isbn, amt);
        return amt;
      }
    }
    isbnPriceCache.set(isbn, ISBN_NOT_FOUND);
    return null;
  } catch {
    isbnPriceCache.set(isbn, ISBN_NOT_FOUND);
    return null;
  }
}

/* --------------------------- reliability badges & pills ----------------------- */

function computeReliability(c) {
  const hasMrp = Number.isFinite(c?.priceINR);
  const hasIsbn = !!(c?.isbn13 || c?.isbn10);
  const fromIsbnPass = !!c?.__fromIsbnPass;
  let score = 0;
  if (hasMrp) score += 80;
  if (hasIsbn) score += 15;
  if (c?.source === 'google') score += 5;
  if (fromIsbnPass) score -= 3;
  const label = hasMrp && hasIsbn ? 'High' : hasMrp ? 'Medium' : 'No MRP found';
  return { score, label };
}
function relBadgeHTML(label) {
  const title =
    label === 'High'
      ? 'Confirmed from primary source'
      : label === 'Medium'
      ? 'Matched via metadata similarity'
      : 'No INR MRP present';
  return `<span class="pill" title="${title}">${label}</span>`;
}
function srcPillHTML(src) {
  const text = src === 'google' ? 'G' : src === 'openlibrary' ? 'OL' : '—';
  const title = `Source: ${src || 'unknown'}`;
  return `<span class="pill" title="${title}">${text}</span>`;
}

/* -------------------------------- progress UI -------------------------------- */

function renderProgressHost(rowEl) {
  // Reuse card space: append after row-meta
  let host = rowEl.querySelector('.lookup-progress');
  if (!host) {
    host = document.createElement('div');
    host.className = 'lookup-progress';
    host.style.marginTop = '.35rem';
    host.style.padding = '.45rem .6rem';
    host.style.border = '1px solid var(--border)';
    host.style.borderRadius = '8px';
    host.style.background = 'var(--surface)';
    host.style.fontSize = '0.9rem';
    rowEl.querySelector('.row-meta')?.appendChild(host);
  }
  return host;
}
function makeSteps(host) {
  host.innerHTML = `
    <ol class="steps" style="margin:0; padding-left:1.1rem; display:grid; gap:.2rem;">
      <li data-k="q">Queuing selection <small class="note" style="opacity:.7"></small></li>
      <li data-k="m">Fetching metadata (ISBN, title, MRP) <small class="note" style="opacity:.7"></small></li>
      <li data-k="c">Downloading cover <small class="note" style="opacity:.7"></small></li>
    </ol>`;
  const els = {
    q: host.querySelector('li[data-k="q"]'),
    m: host.querySelector('li[data-k="m"]'),
    c: host.querySelector('li[data-k="c"]'),
  };
  const state = { timers: new Map() };

  const set = (k, status) => {
    const li = els[k];
    if (!li) return;
    li.style.listStyle = 'none';
    const text = li.firstChild; // text node
    // prefix
    li.dataset.status = status;
    let prefix = '•';
    if (status === 'active') prefix = '⏳';
    if (status === 'done') prefix = '✅';
    if (status === 'fail') prefix = '⚠️';
    li.firstChild?.remove();
    li.insertAdjacentText('afterbegin', `${prefix} `);
  };
  const slow = (k) => {
    const li = els[k];
    if (!li) return;
    const note = li.querySelector('.note');
    if (note) note.textContent = 'Taking longer than usual…';
  };
  const clearSlow = (k) => {
    const li = els[k];
    if (!li) return;
    const note = li.querySelector('.note');
    if (note) note.textContent = '';
  };
  const start = (k) => {
    set(k, 'active');
    clearSlow(k);
    stopTimer(k);
    const t = setTimeout(() => slow(k), 10000);
    state.timers.set(k, t);
  };
  const done = (k) => {
    stopTimer(k);
    clearSlow(k);
    set(k, 'done');
  };
  const fail = (k, msg) => {
    stopTimer(k);
    set(k, 'fail');
    const li = els[k];
    const note = li?.querySelector('.note');
    if (note) note.textContent = msg || 'Something went wrong.';
  };
  const stopTimer = (k) => {
    const t = state.timers.get(k);
    if (t) {
      clearTimeout(t);
      state.timers.delete(k);
    }
  };

  // initial states
  set('q', 'active');
  set('m', 'queued');
  set('c', 'queued');

  return {
    start,
    done,
    fail,
    stopAll: () => [...state.timers.keys()].forEach(stopTimer),
  };
}

/* -------------------------------- main wiring -------------------------------- */

export function wireLookup({
  addForm,
  authorInput,
  coverInput,
  btn,
  msgEl,
  resultsEl,
  autoPrice,
  apiKey,
}) {
  btn.addEventListener('click', async () => {
    msgEl.textContent = '';
    resultsEl.innerHTML = '';

    const title = (addForm.elements['title'].value || '').trim();
    const author = (addForm.elements['author'].value || '').trim();
    if (!title) {
      msgEl.textContent = 'Enter a Title first, then click Find details.';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Searching…';

    try {
      // ---- 1) Google Books (intitle/inauthor) ----
      const qParts = [];
      if (title) qParts.push(`intitle:${title}`);
      if (author) qParts.push(`inauthor:${author}`);
      const key = apiKey ? `&key=${apiKey}` : '';
      const fields =
        'items(id,volumeInfo/title,volumeInfo/authors,volumeInfo/industryIdentifiers,volumeInfo/description,volumeInfo/imageLinks,saleInfo/listPrice,saleInfo/retailPrice)';
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        qParts.join(' ')
      )}&printType=books&maxResults=8&country=IN&fields=${encodeURIComponent(
        fields
      )}${key}`;

      const gRes = await fetch(url);
      const gData = await gRes.json();

      let items = (gData.items || []).map((v) => {
        const vi = v.volumeInfo || {};
        const si = v.saleInfo || {};
        let isbn13 = null,
          isbn10 = null;
        (vi.industryIdentifiers || []).forEach((id) => {
          if (id.type === 'ISBN_13') isbn13 = id.identifier;
          if (id.type === 'ISBN_10') isbn10 = id.identifier;
        });

        const priceINR =
          si?.listPrice?.currencyCode === 'INR'
            ? Math.round(si.listPrice.amount)
            : si?.retailPrice?.currencyCode === 'INR'
            ? Math.round(si.retailPrice.amount)
            : null;

        const img = bestGoogleImage(vi.imageLinks || {});
        const cand = {
          source: 'google',
          gId: v.id,
          title: vi.title || '',
          author: (vi.authors && vi.authors[0]) || '',
          isbn13,
          isbn10,
          priceINR,
          description: vi.description ? stripHtmlAndSquash(vi.description) : '',
          thumb: img ? upgradeGoogleThumb(img) : null,
        };
        cand.__rel = computeReliability(cand);
        return cand;
      });

      // ---- 2) ISBN pass (only if none have INR but some have ISBN) ----
      const needIsbnPass =
        items.length > 0 &&
        items.every((i) => i.priceINR == null) &&
        items.some((i) => i.isbn13 || i.isbn10);

      if (needIsbnPass) {
        const uniqueIsbns = Array.from(
          new Set(items.map((i) => i.isbn13 || i.isbn10).filter(Boolean))
        );
        let anyFound = false;
        await mapLimit(uniqueIsbns, 3, async (isbn) => {
          const inr = await findINRPriceByISBN(isbn, apiKey);
          if (inr != null) {
            anyFound = true;
            items.forEach((it) => {
              if (!it.priceINR && (it.isbn13 === isbn || it.isbn10 === isbn)) {
                it.priceINR = inr;
                it.__fromIsbnPass = true;
                it.__rel = computeReliability(it);
              }
            });
          }
        });
        if (!anyFound && msgEl) {
          msgEl.textContent =
            'No INR MRP found via ISBN lookups (you can enter MRP manually).';
        }
      }

      // ---- 3) Open Library fallback when IDs are weak ----
      const needFallback =
        !items.length || items.every((i) => !i.isbn13 && !i.isbn10);
      if (needFallback) {
        const olUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(
          title
        )}${author ? `&author=${encodeURIComponent(author)}` : ''}&limit=6`;
        try {
          const olRes = await fetch(olUrl);
          const olData = await olRes.json();
          const olItems = (olData.docs || []).map((d) => {
            const c = {
              source: 'openlibrary',
              title: d.title || '',
              author: (d.author_name && d.author_name[0]) || '',
              isbn13: (d.isbn && d.isbn.find((x) => x.length === 13)) || null,
              isbn10: (d.isbn && d.isbn.find((x) => x.length === 10)) || null,
              priceINR: null,
              description: (typeof d.first_sentence === 'string'
                ? d.first_sentence
                : d.subtitle || ''
              ).toString(),
              thumb: null,
            };
            c.__rel = computeReliability(c);
            return c;
          });
          items = items.concat(olItems);
        } catch {}
      }

      if (!items.length) {
        resultsEl.innerHTML =
          '<p class="muted">No results from Google/Open Library.</p>';
        return;
      }

      // ---- order by reliability (desc), then by has price, then by source ----
      items.sort((a, b) => {
        const as = a?.__rel?.score ?? 0;
        const bs = b?.__rel?.score ?? 0;
        if (bs !== as) return bs - as;
        const ap = Number.isFinite(a.priceINR) ? 1 : 0;
        const bp = Number.isFinite(b.priceINR) ? 1 : 0;
        if (bp !== ap) return bp - ap;
        if (a.source !== b.source) return a.source === 'google' ? -1 : 1;
        return 0;
      });

      // Summary line
      const withMrp = items.filter((i) => Number.isFinite(i.priceINR)).length;
      const without = items.length - withMrp;
      const summary = `<div class="muted" style="margin:.25rem 0 .4rem">
        Found ${items.length} results – ${withMrp} with reliable MRP, ${without} without.
      </div>`;

      // ---- render result list ----
      resultsEl.innerHTML =
        summary +
        items
          .map((c, idx) => {
            const relLabel =
              c?.__rel?.label ||
              (c.priceINR != null ? 'Medium' : 'No MRP found');
            const mrpPill =
              c.priceINR != null
                ? ` · <span class="pill">MRP ₹${Math.round(c.priceINR)}</span>`
                : '';
            return `
              <article class="row" data-idx="${idx}" style="${
              c.priceINR == null ? 'opacity:.78' : ''
            }">
                ${
                  c.thumb
                    ? `<img src="${c.thumb}" alt="" />`
                    : `<div style="width:64px;height:64px;background:#333;border-radius:8px;"></div>`
                }
                <div class="row-meta">
                  <strong>${(c.title || '').replace(/</g, '&lt;')}</strong>
                  <div class="muted">
                    ${(c.author || '').replace(/</g, '&lt;')}
                    ${
                      c.isbn13
                        ? ` · <span class="pill">ISBN‑13 ${c.isbn13}</span>`
                        : c.isbn10
                        ? ` · <span class="pill">ISBN‑10 ${c.isbn10}</span>`
                        : ''
                    }
                    ${mrpPill}
                    · ${relBadgeHTML(relLabel)}
                    · ${srcPillHTML(c.source)}
                  </div>
                </div>
                <div class="row-actions">
                  <button class="btn" data-use="${idx}">Use this</button>
                </div>
              </article>`;
          })
          .join('');

      // ---- wire "Use this" with progress UI ----
      resultsEl.querySelectorAll('button[data-use]').forEach((useBtn) => {
        useBtn.addEventListener('click', async () => {
          const idx = Number(useBtn.dataset.use);
          const c = items[idx];
          const row = useBtn.closest('.row');

          // De-emphasize other cards (keep them enabled)
          resultsEl.querySelectorAll('article.row').forEach((el) => {
            if (el !== row) el.style.opacity = '0.7';
          });
          useBtn.disabled = true;

          // Progress panel
          const host = renderProgressHost(row);
          const steps = makeSteps(host);

          try {
            // Step 1: Queuing selection (optimistic, finish fast)
            // (already "active" in makeSteps) → done
            steps.done('q');

            // Step 2: Fetching metadata
            steps.start('m');

            // Fill Title/Author immediately
            const add = addForm.elements;
            if (c.title) add['title'].value = c.title;
            if (c.author) authorInput.value = c.author;

            // MRP: use found INR or cached-by-ISBN, else single ISBN fetch
            const isbn = c.isbn13 || c.isbn10 || '';
            let mrp =
              c.priceINR != null
                ? Math.round(c.priceINR)
                : isbn &&
                  isbnPriceCache.has(isbn) &&
                  isbnPriceCache.get(isbn) !== ISBN_NOT_FOUND
                ? isbnPriceCache.get(isbn)
                : null;

            if (mrp == null && isbn) {
              mrp = await findINRPriceByISBN(isbn, apiKey);
            }
            if (mrp != null) {
              add['mrp'].value = mrp;
              if (typeof autoPrice === 'function') autoPrice();
            }
            if (isbn) add['isbn'].value = isbn;

            if (c.description) {
              add['description'].value = c.description.slice(0, 5000);
            }

            // Try binding via OL
            if (isbn) {
              try {
                const ol = await fetch(
                  `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
                ).then((r) => r.json());
                const key2 = `ISBN:${isbn}`;
                const fmt = ol[key2]?.physical_format
                  ? String(ol[key2].physical_format).toLowerCase()
                  : '';
                if (fmt.includes('hard')) add['binding'].value = 'Hardcover';
                else if (fmt.includes('paper') || fmt.includes('soft'))
                  add['binding'].value = 'Paperback';
              } catch {}
            }

            steps.done('m');

            // Step 3: Downloading cover
            steps.start('c');
            const candidates = [];
            if (c.thumb) candidates.push(c.thumb);
            candidates.push(...olIsbnCoverUrls(isbn));
            if (c.title) {
              try {
                const extra = await olCoverByTitleAuthor(
                  c.title,
                  c.author || ''
                );
                candidates.push(...extra);
              } catch {}
            }
            const ok = await prefillCoverFromCandidates(
              candidates,
              coverInput,
              c.title
            );
            if (!ok) {
              steps.fail('c', 'Could not fetch a cover automatically.');
            } else {
              steps.done('c');
            }

            // Clear and reset emphasis after a short moment so user sees all ✓
            setTimeout(() => {
              resultsEl.innerHTML = '';
            }, 600);
          } catch (err) {
            console.error(err);
            steps.fail('m', 'Unexpected error. Please try another result.');
            // Keep list visible; let user try another card
            useBtn.disabled = false;
            resultsEl
              .querySelectorAll('article.row')
              .forEach((el) => (el.style.opacity = ''));
          }
        });
      });
    } catch (err) {
      console.error(err);
      msgEl.textContent = 'Lookup error: ' + err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Find details (ISBN/MRP)';
    }
  });
}
