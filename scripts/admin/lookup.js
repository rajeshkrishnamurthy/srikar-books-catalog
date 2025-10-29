// scripts/admin/lookup.js
// Intent: fetch book metadata (ISBN/MRP/desc/cover), prioritize reliable MRPs,
// show reliability badges + source pill, avoid redundant INR fetches, and keep
// the existing "Use this" flow + cover prefill intact.

import { stripHtmlAndSquash } from '../helpers/text.js';

/* ----------------------------- infra / helpers ----------------------------- */

// Cache INR-by-ISBN so "Use this" never re-fetches what we already know
const isbnPriceCache = new Map(); // isbn -> number | Symbol('no-inr')
const ISBN_NOT_FOUND = Symbol('no-inr');

// Polite bounded concurrency for ISBN pass
async function mapLimit(items, limit, iter) {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(limit, queue.length) },
    async () => {
      while (queue.length) {
        const next = queue.shift();
        await iter(next);
      }
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

/* --------------------------- INR lookup (by ISBN) --------------------------- */

async function findINRPriceByISBN(isbn, apiKey = '') {
  if (!isbn) return null;

  // cache guard
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

/* ------------------------ Reliability + source badges ------------------------ */

// Compute a defensive reliability score + label.
// High  : has INR MRP AND has ISBN
// Medium: has INR MRP (but no ISBN or came via ISBN-pass)
// No MRP found: no INR price
function computeReliability(candidate) {
  const hasMrp = Number.isFinite(candidate?.priceINR);
  const hasIsbn = !!(candidate?.isbn13 || candidate?.isbn10);
  const fromIsbnPass = !!candidate?.__fromIsbnPass;

  let score = 0;
  if (hasMrp) score += 80;
  if (hasIsbn) score += 15;
  if (candidate?.source === 'google') score += 5;
  if (fromIsbnPass) score -= 3; // slight nudge down

  let label = 'No MRP found';
  if (hasMrp && hasIsbn) label = 'High';
  else if (hasMrp) label = 'Medium';

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

/* --------------------------------- main hook -------------------------------- */

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
        cand.__rel = computeReliability(cand);
        return cand;
      });

      // --- ISBN pass (only if none have INR but some have ISBN) ---
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

      // --- Fallback: Open Library to widen choices (usually no MRP) ---
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
          // soft‑fail; we still show any Google hits we have
        }
      }

      if (!items.length) {
        resultsEl.innerHTML =
          '<p class="muted">No results from Google Books/Open Library.</p>';
        return;
      }

      // --- Order: reliability score (desc), then price presence, then source
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

      // Render list w/ reliability + source pill
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

      // Apply chosen candidate
      resultsEl.querySelectorAll('button[data-use]').forEach((b) => {
        b.addEventListener('click', async () => {
          const i = Number(b.dataset.use);
          const c = items[i];

          // Fill fields
          if (c.title) addForm.elements['title'].value = c.title;
          if (c.author) authorInput.value = c.author;

          const isbn = c.isbn13 || c.isbn10 || '';
          let mrp = Number.isFinite(c.priceINR) ? Math.round(c.priceINR) : null;

          // Reuse cached INR first; avoid redundant network hits
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

          // Try to infer binding
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

          // Cover prefill (thumb → OL by ISBN → OL by title/author)
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
