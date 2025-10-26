// scripts/index/carousel.js — Embla predefined (class names)
import { subscribeToCarousel } from './catalogService.js';
import { settings } from '../config.js';

export async function initCarousel() {
  const shell = document.getElementById('homeCarousel');
  if (!shell) return;

  const emblaRoot = document.getElementById('embla');
  const viewport = document.getElementById('emblaViewport');
  const container = document.getElementById('emblaContainer');
  const btnPrev = document.getElementById('emblaPrev');
  const btnNext = document.getElementById('emblaNext');
  const dotsWrap = document.getElementById('emblaDots');
  const countEl = document.getElementById('carouselCount');

  const Embla = await loadEmbla();
  const ClassNames = await loadClassNames();

  let embla = null;
  let dotBtns = [];

  subscribeToCarousel(
    (docs) => {
      if (!docs.length) {
        shell.hidden = true;
        container.innerHTML = '';
        if (embla) embla.destroy();
        embla = null;
        return;
      }
      shell.hidden = false;
      countEl.textContent = `${docs.length} featured`;

      container.innerHTML = docs.map(slideHTML).join('');

      if (embla) embla.destroy();
      embla = Embla(
        emblaRoot,
        {
          align: 'center',
          containScroll: 'trimSnaps',
          loop: false,
          dragFree: false,
        },
        [ClassNames()]
      );

      // Buttons
      btnPrev.onclick = () => embla && embla.scrollPrev();
      btnNext.onclick = () => embla && embla.scrollNext();

      // Dots
      dotsWrap.innerHTML = '';
      dotBtns = embla.slideNodes().map((_, i) => {
        const b = document.createElement('button');
        b.className = 'embla__dot';
        b.type = 'button';
        b.addEventListener('click', () => embla.scrollTo(i));
        dotsWrap.appendChild(b);
        return b;
      });

      const onSelect = () => {
        const i = embla.selectedScrollSnap();
        dotBtns.forEach((d, idx) =>
          d.classList.toggle('is-selected', idx === i)
        );
        btnPrev.disabled = !embla.canScrollPrev();
        btnNext.disabled = !embla.canScrollNext();
      };
      embla.on('select', onSelect);
      embla.on('reInit', onSelect);
      onSelect();
    },
    (err) => {
      console.error('carousel subscribe error:', err);
      const link = (String(err?.message || '').match(/https?:\/\/\S+/) ||
        [])[0];
      shell.hidden = false;
      container.innerHTML = `
        <div class="muted" style="padding:.6rem">
          The featured carousel needs a Firestore index.
          ${
            link
              ? `<a class="btn btn-secondary" href="${link}" target="_blank" rel="noopener">Create index</a>`
              : ''
          }
        </div>`;
      if (embla) embla.destroy();
      embla = null;
    }
  );
}

// --- helpers ---
function escapeHtml(str = '') {
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[
        m
      ])
  );
}
function waUrl(b) {
  const msg = encodeURIComponent(
    `Hi Srikar, I was going through the book deals on your website and I found a book I liked - "${
      b.title
    }"${b.author ? ` by ${b.author}` : ''}. I would like to buy this book!`
  );
  return `https://wa.me/${settings.whatsappNumber}?text=${msg}`;
}
function slideHTML(b) {
  const img = (b.images && b.images[0]) || './assets/placeholder.webp';
  const bits = [];
  if (b.price != null) bits.push(`₹${escapeHtml(String(b.price))}`);
  if (b.condition) bits.push(escapeHtml(b.condition));

  return `
  <div class="embla__slide">
    <article class="card">
      <img loading="lazy" src="${img}" alt="${escapeHtml(
    b.title || 'Book cover'
  )}" style="width:100%;aspect-ratio:2/3;object-fit:contain;background:#1f2329;display:block;" />
      <div class="meta">
        <h3>${escapeHtml(b.title || 'Untitled')}</h3>
        ${b.author ? `<p class="muted">by ${escapeHtml(b.author)}</p>` : ''}
        ${bits.length ? `<p class="muted">${bits.join(' · ')}</p>` : ''}
        <a class="btn" href="${waUrl(
          b
        )}" target="_blank" rel="noopener">Message on WhatsApp</a>
      </div>
    </article>
  </div>`;
}

/** Prefer ESM from CDN, fallback to UMD globals for robustness. */
async function loadEmbla() {
  try {
    const m = await import(
      'https://cdn.jsdelivr.net/npm/embla-carousel@latest/embla-carousel.esm.js'
    );
    return m.default || m;
  } catch {
    await inject(
      'https://cdn.jsdelivr.net/npm/embla-carousel@latest/embla-carousel.umd.js'
    );
    return window.EmblaCarousel;
  }
}
async function loadClassNames() {
  try {
    const m = await import(
      'https://cdn.jsdelivr.net/npm/embla-carousel-class-names@latest/embla-carousel-class-names.esm.js'
    );
    return m.default || m;
  } catch {
    await inject(
      'https://cdn.jsdelivr.net/npm/embla-carousel-class-names@latest/embla-carousel-class-names.umd.js'
    );
    return window.EmblaCarouselClassNames;
  }
}
function inject(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
}
