// scripts/admin/lookup.js
// Intent: fetch book metadata (ISBN/MRP/desc/cover) from Google Books/Open Library,
// then prioritize reliable MRPs, cache INR-by-ISBN lookups, and avoid redundant calls.
// Also: bounded-concurrency for the ISBN pass + defensive reliability scoring.

import { stripHtmlAndSquash } from '../helpers/text.js';

/* -------------------------- small infra/helpers -------------------------- */

// INR cache so we never refetch the same ISBN again (addresses redundant call).
const isbnPriceCache = new Map(); // isbn -> number|null|Symbol
const ISBN_NOT_FOUND = Symbol('no-inr');

// Bounded concurrency utility for polite API usage.
async function mapLimit(list, limit, iter) {
  const q = Array.from(list);
  const workers = Array.from(
    { length: Math.min(limit, q.length || 0) },
    async function worker() {
      while (q.length) {
        // Take next item
        const item = q.shift();
        // Let errors bubble to allSettled caller
        await iter(item);
      }
    }
  );
  await Promise.allSettled(workers);
}

// Timeout wrapper so we don’t hang forever on a slow API.
function withTimeout(promise, ms = 9000) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

/* ---------------------- cover helpers (unchanged + minor) ---------------------- */

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
  let u = url.replace(/^http:/, 'https:');
  return u.replace('zoom=1', 'zoom=2').replace(/&?edge=curl/g, '');
}
async function setCoverFromUrl(url, coverInput, title = 'cover') {
  if (!url) return false;
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) return false;
    const blob = await r.blob();
    if (!/^image\//.test(blob.type)) return false;
    const ext = (blob.type.split('/')[1] || 'jpg').toLowerCase();
    const safe =
      String(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 50) || 'cover';
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
async function prefillCoverFromCandidates(
  candidates,
  coverInput,
  title,
  msgEl
) {
  if (!candidates.length) return false;
  if (msgEl) msgEl.textContent = 'Downloading cover…';
  for (const u of candidates) {
    if (await setCoverFromUrl(u, coverInput, title)) {
      if (msgEl) msgEl.textContent = 'Fields updated (cover pre‑filled).';
      return true;
    }
  }
  if (msgEl)
    msgEl.textContent =
      'Fields updated. Couldn’t fetch a cover; please upload one.';
  return false;
}

/* ---------------------- INR MRP (Google Books by ISBN) ---------------------- */

async function findINRPriceByISBN(isbn, apiKey = '') {
  if (!isbn) return null;

  // 1) Cache guard (prevents redundant request on selection and across searches)
  if (isbnPriceCache.has(isbn)) {
    const v = isbnPriceCache.get(isbn);
    return v === ISBN_NOT_FOUND ? null : v;
  }

  const key = apiKey ? `&key=${apiKey}` : '';
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(
    isbn
  )}&printType=books&country=IN${key}`;

  try {
    const res = await withTimeout(fetch(url), 9000);
    const data = await res.json();
    const items = data?.items || [];
    for (const v of items) {
      const si = v?.saleInfo;
      const lp = si?.listPrice;
      const rp = si?.retailPrice;
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
    // Negative cache to avoid hammering on flaky networks within the same session.
    isbnPriceCache.set(isbn, ISBN_NOT_FOUND);
    return null;
  }
}

/* ------------------- Reliability scoring (defensive defaults) ------------------- */

function computeReliability(candidate) {
  // Defensive defaults to avoid fragile access (addresses the review).
  const src = candidate?.source || 'unknown';
  const hasIsbn = !!(candidate?.isbn13 || candidate?.isbn10);
  const hasMrp = Number.isFinite(candidate?.priceINR);
  let score = 0;

  // Signal: having INR MRP is the strongest indicator.
  if (hasMrp) score += 80;
  if (hasIsbn) score += 15;
  if (src === 'google') score += 5;

  // Labels
  let label;
  if (hasMrp && hasIsbn) label = 'High';
  else if (hasMrp) label = 'Medium';
  else label = 'No MRP found';

  return { score, label };
}
function badgeHTML(label) {
  const cls = label === 'High' ? 'pill' : label === 'Medium' ? 'pill' : 'pill'; // keep same style; color comes from your CSS palette
  return `<span class="${cls}" title="${
    label === 'High'
      ? 'Confirmed from primary source'
      : label === 'Medium'
      ? 'Matched via metadata similarity'
      : 'No INR MRP present'
  }">${label}</span>`;
}

/* ------------------------------ main wiring ------------------------------ */

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
      // --- Primary Google query (intitle/inauthor) ---
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
        cand.__rel = computeReliability(cand); // safe + defaulted
        return cand;
      });

      // --- ISBN pass: only if no INR in any candidate but we do have ISBNs ---
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

      // --- Fallback: Open Library when there are no ISBNs at all ---
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
            const cand = {
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
            cand.__rel = computeReliability(cand);
            return cand;
          });
          items = items.concat(olItems);
        } catch {
          if (msgEl)
            msgEl.textContent = 'Network issue while querying Open Library.';
        }
      }

      if (!items.length) {
        resultsEl.innerHTML =
          '<p class="muted">No results from Google Books/Open Library.</p>';
        return;
      }

      // --- Order by reliability > price presence > source ---
      items.sort((a, b) => {
        const as = a?.__rel?.score ?? 0;
        const bs = b?.__rel?.score ?? 0;
        if (bs !== as) return bs - as;
        const ap = Number.isFinite(a.priceINR) ? 1 : 0;
        const bp = Number.isFinite(b.priceINR) ? 1 : 0;
        if (bp !== ap) return bp - ap;
        // prefer google
        if (a.source !== b.source) return a.source === 'google' ? -1 : 1;
        return 0;
      });

      // --- Summary line (developer-friendly counts) ---
      const withMrp = items.filter((i) => Number.isFinite(i.priceINR)).length;
      const without = items.length - withMrp;
      const summaryLine = `<div class="muted" style="margin: .25rem 0 .4rem">
        Found ${items.length} results – ${withMrp} with reliable MRP, ${without} without.
      </div>`;

      // --- Render candidates with reliability badges ---
      resultsEl.innerHTML =
        summaryLine +
        items
          .map((c, idx) => {
            const relLabel =
              (c.__rel && c.__rel.label) ||
              (c.priceINR != null ? 'Medium' : 'No MRP found');
            const mrpPill =
              c.priceINR != null
                ? ` · <span class="pill">MRP ₹${Math.round(c.priceINR)}</span>`
                : '';
            return `
              <article class="row" data-idx="${idx}" style="${
              c.priceINR == null ? 'opacity:.7' : ''
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
                    ${mrpPill} · ${badgeHTML(relLabel)}
                  </div>
                </div>
                <div class="row-actions">
                  <button class="btn" data-use="${idx}">Use this</button>
                </div>
              </article>`;
          })
          .join('');

      // --- Apply chosen candidate (no redundant INR fetch; reuse cache) ---
      resultsEl.querySelectorAll('button[data-use]').forEach((btn2) => {
        btn2.addEventListener('click', async () => {
          const i = Number(btn2.dataset.use);
          const c = items[i];

          // 1) Fill fields
          if (c.title) addForm.elements['title'].value = c.title;
          if (c.author) authorInput.value = c.author;

          const isbn = c.isbn13 || c.isbn10 || '';
          let mrp = Number.isFinite(c.priceINR) ? Math.round(c.priceINR) : null;

          // Reuse cache instead of refetching (addresses the “redundant fetch” review).
          if (mrp == null && isbn && isbnPriceCache.has(isbn)) {
            const cached = isbnPriceCache.get(isbn);
            if (cached !== ISBN_NOT_FOUND) mrp = cached;
          }
          if (mrp != null) {
            addForm.elements['mrp'].value = mrp;
            autoPrice && autoPrice();
          }

          if (isbn) addForm.elements['isbn'].value = isbn;
          if (c.description)
            addForm.elements['description'].value = c.description.slice(
              0,
              5000
            );

          // Infer format via OpenLibrary (best‑effort)
          if (isbn) {
            try {
              const ol = await fetch(
                `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
              ).then((r) => r.json());
              const key2 = `ISBN:${isbn}`;
              const fmt = ol[key2]?.physical_format
                ? String(ol[key2].physical_format).toLowerCase()
                : '';
              if (fmt.includes('hard'))
                addForm.elements['binding'].value = 'Hardcover';
              else if (fmt.includes('paper') || fmt.includes('soft'))
                addForm.elements['binding'].value = 'Paperback';
            } catch {}
          }

          // 2) Cover prefill
          const candidates = [];
          if (c.thumb) candidates.push(c.thumb);
          candidates.push(...olIsbnCoverUrls(isbn));
          if (c.title) {
            const extra = await olCoverByTitleAuthor(c.title, c.author || '');
            candidates.push(...extra);
          }
          await prefillCoverFromCandidates(
            candidates,
            coverInput,
            c.title,
            msgEl
          );

          resultsEl.innerHTML = '';
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
