// scripts/admin/lookup.js
// Intent: fetch book metadata (ISBN/MRP/desc/cover) with a clear, stepwise progress UI
// Steps: 1) Queuing selection  2) Fetching metadata (ISBN, title, MRP)  3) Downloading cover

import { stripHtmlAndSquash } from '../helpers/text.js';

// ---------- helpers: choose best Google image, fetch as File for <input type="file"> ----------
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
async function prefillCoverFromCandidates(candidates, coverInput, title) {
  for (const u of candidates) {
    if (await setCoverFromUrl(u, coverInput, title)) return true;
  }
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

// =======================
// Progress UI (per card)
// =======================
const LONG_STEP_MS = 10000;

function buildProgressPanel(card) {
  let panel = card.querySelector('.lookup-progress');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'lookup-progress';
    panel.setAttribute('aria-live', 'polite');
    card.appendChild(panel);
  }
  panel.innerHTML = `
    <ol class="lookup-steps">
      <li data-step="queue"><span class="spin" hidden></span><span class="mark" hidden>✓</span><span class="label">Queuing selection</span><small class="step-hint" hidden></small></li>
      <li data-step="fetch"><span class="spin" hidden></span><span class="mark" hidden>✓</span><span class="label">Fetching metadata (ISBN, title, MRP)</span><small class="step-hint" hidden></small></li>
      <li data-step="cover"><span class="spin" hidden></span><span class="mark" hidden>✓</span><span class="label">Downloading cover</span><small class="step-hint" hidden></small></li>
    </ol>
  `;
  const timers = new Map();

  function node(step) {
    return panel.querySelector(`li[data-step="${step}"]`);
  }
  function setState(step, state, msg = '') {
    const li = node(step);
    if (!li) return;
    li.classList.remove('is-queued', 'is-current', 'is-done', 'is-failed');
    li.classList.add(`is-${state}`);
    const spin = li.querySelector('.spin');
    const mark = li.querySelector('.mark');
    const hint = li.querySelector('.step-hint');
    if (spin) spin.hidden = state !== 'current';
    if (mark) mark.hidden = state !== 'done';
    if (hint) {
      hint.hidden = !(state === 'current' && hint.textContent);
      if (msg) {
        hint.textContent = msg;
        hint.hidden = false;
      }
    }
    // long-running hint
    clearTimeout(timers.get(step));
    if (state === 'current') {
      timers.set(
        step,
        setTimeout(() => {
          const li2 = node(step);
          const h = li2?.querySelector('.step-hint');
          if (h && !li2.classList.contains('is-done')) {
            h.textContent = 'Taking longer than usual…';
            h.hidden = false;
          }
        }, LONG_STEP_MS)
      );
    }
  }
  return {
    start(step) {
      setState(step, 'current');
    },
    done(step) {
      setState(step, 'done');
    },
    fail(step, message) {
      setState(step, 'failed', message || '');
    },
    clearLong(step) {
      clearTimeout(timers.get(step));
    },
  };
}

function dimSiblings(resultsEl, selectedCard) {
  Array.from(resultsEl.children).forEach((el) => {
    if (el === selectedCard) el.classList.add('is-selected');
    else el.classList.add('is-dimmed');
  });
}
function undimAll(resultsEl) {
  Array.from(resultsEl.children).forEach((el) => {
    el.classList.remove('is-dimmed', 'is-selected');
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- main wiring ----------
export function wireLookup({
  addForm,
  authorInput,
  coverInput,
  btn, // "Find details" button
  msgEl, // global message (still used for search errors)
  resultsEl, // container where candidates render
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

      // Render candidates (each card gets an inline progress area)
      resultsEl.innerHTML = items
        .map(
          (c, idx) => `
        <article class="row lookup-card" data-idx="${idx}">
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
          <div class="lookup-progress" aria-live="polite"></div>
        </article>`
        )
        .join('');

      // Apply chosen candidate
      resultsEl.querySelectorAll('button[data-use]').forEach((useBtn) => {
        useBtn.addEventListener('click', async () => {
          const i = Number(useBtn.dataset.use);
          const c = items[i];
          const card = useBtn.closest('.lookup-card');

          // Immediate acknowledgement
          useBtn.disabled = true;
          useBtn.textContent = 'Working…';
          dimSiblings(resultsEl, card);
          const progress = buildProgressPanel(card);

          // STEP 1: Queuing selection (optimistic; completes immediately)
          progress.start('queue');
          await wait(50); // keep it snappy but visible
          progress.done('queue');

          // STEP 2: Fetching metadata (ISBN, title, MRP)
          progress.start('fetch');
          try {
            // Fill readily available fields
            if (c.title) addForm.elements['title'].value = c.title;
            if (c.author) authorInput.value = c.author;

            const isbn = c.isbn13 || c.isbn10 || '';
            // Parallel: INR by ISBN (if needed) + physical_format inference
            let mrp = c.priceINR != null ? Math.round(c.priceINR) : null;

            const tasks = [];
            if (mrp == null && isbn) {
              tasks.push(
                (async () => {
                  const inr = await findINRPriceByISBN(isbn, apiKey);
                  if (inr != null) mrp = Math.round(inr);
                })()
              );
            }
            if (isbn) {
              tasks.push(
                (async () => {
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
                })()
              );
            }
            await Promise.all(tasks);

            if (mrp != null) {
              addForm.elements['mrp'].value = mrp;
              autoPrice && autoPrice();
            }
            if (isbn) addForm.elements['isbn'].value = isbn;
            if (c.description) {
              addForm.elements['description'].value = c.description.slice(
                0,
                5000
              );
            }

            progress.done('fetch');
          } catch (err) {
            console.error('fetch step error:', err);
            progress.fail('fetch');
          }

          // STEP 3: Downloading cover
          progress.start('cover');
          try {
            const isbn = c.isbn13 || c.isbn10 || '';
            const candidates = [];
            if (c.thumb) candidates.push(c.thumb);
            candidates.push(...olIsbnCoverUrls(isbn));
            if (c.title) {
              const extra = await olCoverByTitleAuthor(c.title, c.author || '');
              candidates.push(...extra);
            }

            const ok = await prefillCoverFromCandidates(
              candidates,
              coverInput,
              c.title
            );
            if (ok) {
              progress.done('cover');
            } else {
              progress.fail(
                'cover',
                'Couldn’t fetch a cover; please upload one.'
              );
            }
          } catch (err) {
            console.error('cover step error:', err);
            progress.fail(
              'cover',
              'Couldn’t fetch a cover; please upload one.'
            );
          }

          // Let the user see the “done/failed” state briefly, then clear
          await wait(450);
          undimAll(resultsEl);
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
