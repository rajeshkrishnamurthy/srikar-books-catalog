// Intent: fetch book metadata (ISBN/MRP/desc/cover) from Google Books/Open Library,
// then *improve hit-rate* by: (1) ISBN-specific INR price pass, (2) more robust cover fallbacks.

import { stripHtmlAndSquash } from '../helpers/text.js';

// ---------- helpers: choose best Google image, fetch as File for <input type="file"> ----------
function bestGoogleImage(links = {}) {
  // Prefer largest available; fallback to smaller ones
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
  // Some thumbs support a 'zoom' param; bump if present
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
    // Notify listeners so the preview updates
    try {
      coverInput.dispatchEvent(new Event('change', { bubbles: true }));
    } catch {}
    return true;
  } catch {
    return false;
  }
}

// ---------- Open Library cover candidates ----------
function olIsbnCoverUrls(isbn) {
  return isbn
    ? [
        `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,
        `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`,
      ]
    : [];
}
async function olCoverByTitleAuthor(title, author) {
  // Some Indian/older editions have no ISBN cover but have a cover_i via search
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

// Try candidates until one sticks in the file input
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

// ---------- INR price pass by ISBN (Google Books) ----------
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

// ---------- main wiring ----------
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
      // Primary Google query (intitle/inauthor)
      const qParts = [];
      if (title) qParts.push(`intitle:${title}`);
      if (author) qParts.push(`inauthor:${author}`);
      const key = apiKey ? `&key=${apiKey}` : '';
      const fields =
        'items(id,volumeInfo/title,volumeInfo/authors,volumeInfo/industryIdentifiers,volumeInfo/description,volumeInfo/imageLinks, saleInfo/listPrice,saleInfo/retailPrice)';
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

      // If every candidate lacks an INR price but we have ISBNs, try the ISBN pass
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
            // Fill price for all candidates with this ISBN (first good INR wins)
            items.forEach((it) => {
              if (!it.priceINR && (it.isbn13 === isbn || it.isbn10 === isbn)) {
                it.priceINR = inr;
              }
            });
          }
        }
      }

      // Fallback: Open Library if we failed to get any ISBNs
      const needFallback =
        !items.length || items.every((i) => !i.isbn13 && !i.isbn10);
      if (needFallback) {
        const olUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(
          title
        )}${author ? `&author=${encodeURIComponent(author)}` : ''}&limit=6`;
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

      // Render candidates
      resultsEl.innerHTML = items
        .map(
          (c, idx) => `
        <article class="row" data-idx="${idx}">
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
                    )}</span>`
                  : ''
              }
            </div>
          </div>
          <div class="row-actions">
            <button class="btn" data-use="${idx}">Use this</button>
          </div>
        </article>`
        )
        .join('');

      // Apply chosen candidate
      resultsEl.querySelectorAll('button[data-use]').forEach((btn2) => {
        btn2.addEventListener('click', async () => {
          const i = Number(btn2.dataset.use);
          const c = items[i];

          // 1) Fields
          if (c.title) addForm.elements['title'].value = c.title;
          if (c.author) authorInput.value = c.author;

          // MRP: use known INR, else try ISBN pass again just for this choice
          const isbn = c.isbn13 || c.isbn10 || '';
          let mrp = c.priceINR != null ? Math.round(c.priceINR) : null;
          if (mrp == null && isbn) {
            mrp = await findINRPriceByISBN(isbn, apiKey);
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

          // Attempt to infer format via OpenLibrary for this ISBN
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

          // 2) Cover prefill: (a) best Google image, (b) OL by ISBN, (c) OL by title/author
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
