// scripts/admin/lookup.js
// Intent: fetch book metadata (ISBN/MRP/desc/cover) from Google Books/Open Library,
// then rank results by an explicit "MRP reliability" score and render badges + a summary.
// Non-goals: Change downstream "Use this" behavior. UI remains minimal (pills + summary).

import { stripHtmlAndSquash } from '../helpers/text.js';

/* -------------------------- Reliability heuristics -------------------------- *
   We only have Google Books + Open Library, so we proxy "reliability" by:
   - INR price present (strong signal)
   - ISBN presence
   - Source weight (Google > Open Library)
   - Title / Author match strength vs the admin’s query
   - Plausible INR range
   Levels:
     High   >= 75
     Medium 50–74
     Low    25–49
   “No MRP found” is rendered when priceINR is null, regardless of score.
* --------------------------------------------------------------------------- */

function normalize(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/[\u00A0]/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function containsEither(a = '', b = '') {
  const A = normalize(a),
    B = normalize(b);
  return A && B && (A.includes(B) || B.includes(A));
}
function plausibleINR(price) {
  // Keep wide bounds to avoid false negatives; tweak if you learn more.
  return Number.isFinite(price) && price >= 50 && price <= 10000;
}
function reliabilityScore(item, qTitle, qAuthor) {
  const srcWeight = item.source === 'google' ? 10 : 4;
  const hasIsbn13 = !!item.isbn13;
  const hasIsbn10 = !!item.isbn10;
  const hasIsbn = hasIsbn13 || hasIsbn10;
  const hasPrice = item.priceINR != null;

  let score = 0;
  if (hasPrice) score += 50;
  if (hasIsbn && hasPrice) score += 10; // MRPs anchored to an ISBN are better
  else if (hasIsbn) score += 6;

  // title / author match strength vs the admin-provided text
  if (qTitle) {
    if (normalize(item.title) === normalize(qTitle)) score += 20;
    else if (containsEither(item.title, qTitle)) score += 10;
  }
  if (qAuthor && item.author) {
    if (normalize(item.author) === normalize(qAuthor)) score += 10;
    else if (containsEither(item.author, qAuthor)) score += 5;
  }

  // Price reasonableness nudges score
  if (hasPrice && plausibleINR(item.priceINR)) score += 5;

  score += srcWeight; // source prior
  if (item.description) score += 2;

  // clamp to 0..100
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return score;
}
function reliabilityLevel(score, hasPrice) {
  if (!hasPrice) return { level: 'none', label: 'No MRP found', tip: '' };
  if (score >= 75)
    return {
      level: 'high',
      label: 'High',
      tip: 'Confirmed from primary source',
    };
  if (score >= 50)
    return {
      level: 'medium',
      label: 'Medium',
      tip: 'Matched via metadata similarity',
    };
  return { level: 'low', label: 'Low', tip: 'Derived from weak match' };
}

function summarize(items) {
  const total = items.length;
  const withMrp = items.filter((i) => i.priceINR != null);
  const reliable = withMrp.filter((i) => i.__rel.score >= 50); // High/Medium
  const without = total - withMrp.length;
  return { total, reliable: reliable.length, without };
}

/* --------- helpers: choose best Google image; prefill cover into input ------- */

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
  u = u.replace('zoom=1', 'zoom=2');
  return u.replace(/&?edge=curl/g, '');
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
      // So any attached preview updates
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

/* ------------------------- INR price pass by ISBN (GB) ----------------------- */

async function findINRPriceByISBN(isbn, apiKey = '') {
  if (!isbn) return null;
  const key = apiKey ? `&key=${apiKey}` : '';
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(
    isbn
  )}&printType=books&country=IN${key}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = data?.items || [];
    for (const v of items) {
      const si = v?.saleInfo;
      const lp = si?.listPrice;
      const rp = si?.retailPrice;
      if (lp?.currencyCode === 'INR') return Math.round(lp.amount);
      if (rp?.currencyCode === 'INR') return Math.round(rp.amount);
    }
    return null;
  } catch {
    return null;
  }
}

/* --------------------------------- main ------------------------------------- */

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
    const qTitle = (addForm.elements['title'].value || '').trim();
    const qAuthor = (addForm.elements['author'].value || '').trim();
    if (!qTitle) {
      msgEl.textContent = 'Enter a Title first, then click Find details.';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Searching…';

    try {
      // ---- Primary Google query (intitle/inauthor) ----
      const parts = [];
      if (qTitle) parts.push(`intitle:${qTitle}`);
      if (qAuthor) parts.push(`inauthor:${qAuthor}`);
      const key = apiKey ? `&key=${apiKey}` : '';
      const fields =
        'items(id,volumeInfo/title,volumeInfo/authors,volumeInfo/industryIdentifiers,volumeInfo/description,volumeInfo/imageLinks,saleInfo/listPrice,saleInfo/retailPrice)';
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        parts.join(' ')
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
            ? si.listPrice.amount
            : si?.retailPrice?.currencyCode === 'INR'
            ? si.retailPrice.amount
            : null;

        const img = bestGoogleImage(vi.imageLinks || {});
        return {
          source: 'google',
          gId: v.id,
          title: vi.title || '',
          author: (vi.authors && vi.authors[0]) || '',
          isbn13,
          isbn10,
          priceINR: priceINR != null ? Math.round(priceINR) : null,
          description: vi.description ? stripHtmlAndSquash(vi.description) : '',
          thumb: img ? upgradeGoogleThumb(img) : null,
        };
      });

      // If every candidate lacks INR price but we have ISBNs, try ISBN pass
      const needIsbnPass =
        items.length > 0 &&
        items.every((i) => i.priceINR == null) &&
        items.some((i) => i.isbn13 || i.isbn10);

      if (needIsbnPass) {
        const uniqueIsbns = Array.from(
          new Set(items.map((i) => i.isbn13 || i.isbn10).filter(Boolean))
        );
        for (const isbn of uniqueIsbns) {
          const inr = await findINRPriceByISBN(isbn, apiKey);
          if (inr != null) {
            items.forEach((it) => {
              if (!it.priceINR && (it.isbn13 === isbn || it.isbn10 === isbn)) {
                it.priceINR = Math.round(inr);
              }
            });
          }
        }
      }

      // Fallback: Open Library if nothing has ISBN
      const needFallback =
        !items.length || items.every((i) => !i.isbn13 && !i.isbn10);
      if (needFallback) {
        const olUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(
          qTitle
        )}${qAuthor ? `&author=${encodeURIComponent(qAuthor)}` : ''}&limit=6`;
        try {
          const olRes = await fetch(olUrl);
          const olData = await olRes.json();
          const olItems = (olData.docs || []).map((d) => ({
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
          }));
          items = items.concat(olItems);
        } catch {}
      }

      if (!items.length) {
        resultsEl.innerHTML =
          '<p class="muted">No results from Google Books/Open Library.</p>';
        return;
      }

      // ---- Score, level, sort (MRP first by reliability; then no-MRP by reliability) ----
      const scored = items.map((it) => {
        const score = reliabilityScore(it, qTitle, qAuthor);
        const hasPrice = it.priceINR != null;
        const lvl = reliabilityLevel(score, hasPrice);
        return { ...it, __rel: { score, ...lvl } };
      });

      const withPrice = scored.filter((i) => i.priceINR != null);
      const withoutPrice = scored.filter((i) => i.priceINR == null);
      withPrice.sort((a, b) => b.__rel.score - a.__rel.score);
      withoutPrice.sort((a, b) => b.__rel.score - a.__rel.score);
      const ranked = withPrice.concat(withoutPrice);

      // ---- Summary line ----
      const { total, reliable, without } = summarize(ranked);
      const summaryHtml = `<div class="muted" style="margin:.2rem 0 .5rem">
        Found <strong>${total}</strong> results – <strong>${reliable}</strong> with reliable MRP, <strong>${without}</strong> without.
      </div>`;

      // ---- Render candidate cards with reliability pill ----
      const cardsHtml = ranked
        .map(
          (c, idx) => `
        <article class="row" data-idx="${idx}" style="${
            c.priceINR == null ? 'opacity:.85' : ''
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
              ${
                c.priceINR != null
                  ? ` · <span class="pill">MRP ₹${Math.round(
                      c.priceINR
                    )}</span> <span class="pill pill--reliab-${
                      c.__rel.level
                    }" title="${c.__rel.tip}">Reliability: ${
                      c.__rel.label
                    }</span>`
                  : ` · <span class="pill pill--reliab-none">No MRP found</span>`
              }
            </div>
          </div>
          <div class="row-actions">
            <button class="btn" data-use="${idx}">Use this</button>
          </div>
        </article>`
        )
        .join('');

      resultsEl.innerHTML = summaryHtml + cardsHtml;

      // ---- Apply chosen candidate (unchanged behavior) ----
      resultsEl.querySelectorAll('button[data-use]').forEach((btn2) => {
        btn2.addEventListener('click', async () => {
          const i = Number(btn2.dataset.use);
          const c = ranked[i];

          // 1) Fill fields
          if (c.title) addForm.elements['title'].value = c.title;
          if (c.author) authorInput.value = c.author;

          // MRP: prefer known INR; else try ISBN pass just for this choice
          const isbn = c.isbn13 || c.isbn10 || '';
          let mrp = c.priceINR != null ? Math.round(c.priceINR) : null;
          if (mrp == null && isbn) mrp = await findINRPriceByISBN(isbn, apiKey);
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

          // Infer format via Open Library for this ISBN (best‑effort)
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

          // 2) Cover prefill candidates: Google best, then OL by ISBN, then OL by search
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

          // Clear the list post selection (unchanged UX)
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
