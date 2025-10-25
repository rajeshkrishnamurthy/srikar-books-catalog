// Intent: fetch book metadata (ISBN/MRP/desc/cover) from Google Books/Open Library and apply to the form.
import { stripHtmlAndSquash } from '../helpers/text.js';

function upgradeGoogleThumb(url=''){
  if (!url) return '';
  let u = url.replace(/^http:/, 'https:');
  u = u.replace('zoom=1','zoom=2');
  u = u.replace(/&?edge=curl/g,'');
  return u;
}
function coverUrlsFromIsbn(isbn){
  if (!isbn) return [];
  return [
    `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,
    `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`
  ];
}

async function setCoverFromUrl(url, coverInput, title='cover'){
  if (!url) return false;
  try {
    const r = await fetch(url, {mode:'cors'});
    if (!r.ok) return false;
    const blob = await r.blob();
    if (!/^image\//.test(blob.type)) return false;
    const ext = (blob.type.split('/')[1] || 'jpg').toLowerCase();
    const safe = String(title).toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,50) || 'cover';
    const file = new File([blob], `${safe}.${ext}`, { type: blob.type });
    const dt = new DataTransfer();
    dt.items.add(file);
    coverInput.files = dt.files;
    return true;
  } catch(e){
    console.warn('Cover fetch failed', url, e);
    return false;
  }
}

export function wireLookup({ addForm, authorInput, coverInput, btn, msgEl, resultsEl, autoPrice, apiKey }){
  btn.addEventListener('click', async () => {
    msgEl.textContent = '';
    resultsEl.innerHTML = '';
    const title = (addForm.elements['title'].value || '').trim();
    const author = (addForm.elements['author'].value || '').trim();
    if (!title) { msgEl.textContent = 'Enter a Title first, then click Find details.'; return; }

    btn.disabled = true; btn.textContent = 'Searching…';
    try {
      const qParts = [];
      if (title)  qParts.push(`intitle:${title}`);
      if (author) qParts.push(`inauthor:${author}`);
      const key = apiKey ? `&key=${apiKey}` : '';
      const fields = 'items(volumeInfo/title,volumeInfo/authors,volumeInfo/industryIdentifiers,volumeInfo/description,volumeInfo/imageLinks/thumbnail,volumeInfo/imageLinks/smallThumbnail,saleInfo/listPrice,saleInfo/retailPrice)';
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(qParts.join(' '))}&printType=books&maxResults=6&country=IN&fields=${encodeURIComponent(fields)}${key}`;
      const gRes = await fetch(url);
      const gData = await gRes.json();

      let items = (gData.items || []).map(v => {
        const vi = v.volumeInfo || {}, si = v.saleInfo || {};
        let isbn13=null, isbn10=null;
        (vi.industryIdentifiers || []).forEach(id => {
          if (id.type === 'ISBN_13') isbn13 = id.identifier;
          if (id.type === 'ISBN_10') isbn10 = id.identifier;
        });
        const priceINR = (si.listPrice && si.listPrice.currencyCode==='INR') ? si.listPrice.amount
                          : (si.retailPrice && si.retailPrice.currencyCode==='INR') ? si.retailPrice.amount
                          : null;
        const thumb = vi.imageLinks && (vi.imageLinks.thumbnail || vi.imageLinks.smallThumbnail);
        return {
          source: 'google',
          title: vi.title || '',
          author: (vi.authors && vi.authors[0]) || '',
          isbn13, isbn10, priceINR,
          description: vi.description ? stripHtmlAndSquash(vi.description) : '',
          thumb
        };
      });

      const needFallback = !items.length || items.every(i => !i.isbn13 && !i.isbn10);
      if (needFallback) {
        const olUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}${author ? `&author=${encodeURIComponent(author)}`:''}&limit=6`;
        try {
          const olRes = await fetch(olUrl);
          const olData = await olRes.json();
          const olItems = (olData.docs || []).map(d => ({
            source: 'openlibrary',
            title: d.title || '',
            author: (d.author_name && d.author_name[0]) || '',
            isbn13: (d.isbn && d.isbn.find(x => x.length === 13)) || null,
            isbn10: (d.isbn && d.isbn.find(x => x.length === 10)) || null,
            priceINR: null,
            description: (typeof d.first_sentence === 'string' ? d.first_sentence : (d.subtitle || '')).toString(),
            thumb: null
          }));
          items = items.concat(olItems);
        } catch(_) {}
      }

      if (!items.length) {
        resultsEl.innerHTML = '<p class="muted">No results from Google Books/Open Library.</p>';
      } else {
        resultsEl.innerHTML = items.map((c, idx) => `
          <article class="row" data-idx="${idx}">
            ${c.thumb ? `<img src="${c.thumb}" alt="" />` : `<div style="width:64px;height:64px;background:#333;border-radius:8px;"></div>`}
            <div class="row-meta">
              <strong>${c.title.replace(/</g,'&lt;')}</strong>
              <div class="muted">
                ${(c.author || '').replace(/</g,'&lt;')}
                ${c.isbn13 ? ` · <span class="pill">ISBN‑13 ${c.isbn13}</span>` : (c.isbn10 ? ` · <span class="pill">ISBN‑10 ${c.isbn10}</span>` : '')}
                ${c.priceINR != null ? ` · <span class="pill">MRP ₹${Math.round(c.priceINR)}</span>` : ''}
              </div>
            </div>
            <div class="row-actions">
              <button class="btn" data-use="${idx}">Use this</button>
            </div>
          </article>
        `).join('');

        resultsEl.querySelectorAll('button[data-use]').forEach(btn2 => {
          btn2.addEventListener('click', async () => {
            const i = Number(btn2.dataset.use);
            const c = items[i];

            if (c.title)  addForm.elements['title'].value  = c.title;
            if (c.author) authorInput.value = c.author;
            if (c.priceINR != null) {
              addForm.elements['mrp'].value = Math.round(c.priceINR);
              autoPrice && autoPrice();
            }
            const isbn = c.isbn13 || c.isbn10 || '';
            if (isbn) addForm.elements['isbn'].value = isbn;
            if (c.description) addForm.elements['description'].value = c.description.slice(0, 5000);

            // attempt format via OL
            if (isbn) {
              try {
                const ol = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`).then(r => r.json());
                const key = `ISBN:${isbn}`;
                const fmt = ol[key] && ol[key].physical_format ? String(ol[key].physical_format).toLowerCase() : '';
                if (fmt.includes('hard')) addForm.elements['binding'].value = 'Hardcover';
                else if (fmt.includes('paper') || fmt.includes('soft')) addForm.elements['binding'].value = 'Paperback';
              } catch{}
            }

            // cover prefill
            const candidates = [];
            if (c.thumb) candidates.push(upgradeGoogleThumb(c.thumb));
            candidates.push(...coverUrlsFromIsbn(isbn));
            msgEl.textContent = 'Downloading cover…';
            for (const u of candidates) {
              const ok = await setCoverFromUrl(u, coverInput, c.title);
              if (ok) { msgEl.textContent = 'Fields updated (cover pre‑filled).'; resultsEl.innerHTML=''; return; }
            }
            msgEl.textContent = 'Fields updated. Couldn’t fetch a cover; please upload one.';
            resultsEl.innerHTML='';
          });
        });
      }
    } catch (err) {
      console.error(err);
      msgEl.textContent = 'Lookup error: ' + err.message;
    } finally {
      btn.disabled = false; btn.textContent = 'Find details (ISBN/MRP)';
    }
  });
}
