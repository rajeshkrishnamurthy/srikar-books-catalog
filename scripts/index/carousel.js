// scripts/index/carousel.js — Embla predefined (Class Names) + category-aware
import { subscribeToCarousel } from './catalogService.js';
import { settings } from '../config.js';

// Preload the first slide image so it fetches ASAP
function preloadFirstImage(src) {
  if (!src) return;
  // avoid duplicates
  if (
    document.head.querySelector(
      `link[rel="preload"][as="image"][href="${src}"]`
    )
  )
    return;
  const l = document.createElement('link');
  l.rel = 'preload';
  l.as = 'image';
  l.href = src;
  document.head.appendChild(l);
}

let currentCategory = null;
let unsubCarousel = null;
let embla = null;
let EmblaCarousel = null;
let ClassNames = null;

export async function initCarousel(initialCategory = null) {
  currentCategory = initialCategory;

  const viewport = document.getElementById('emblaViewport');
  const container = document.getElementById('emblaContainer');
  const dotsWrap = document.getElementById('emblaDots');
  const btnPrev = document.getElementById('emblaPrev');
  const btnNext = document.getElementById('emblaNext');
  const countEl = document.getElementById('carouselCount');
  const shell = document.getElementById('homeCarousel');

  if (!viewport || !container) return;

  EmblaCarousel = await loadEmbla();
  ClassNames = await loadClassNames().catch(() => null);

  // Buttons wired once; they act on the current embla instance
  btnPrev?.addEventListener('click', () => embla && embla.scrollPrev());
  btnNext?.addEventListener('click', () => embla && embla.scrollNext());

  function render(docs) {
    if (!docs.length) {
      shell.hidden = true;
      container.innerHTML = '';
      if (embla) {
        embla.destroy();
        embla = null;
      }
      dotsWrap.innerHTML = '';
      if (btnPrev) btnPrev.disabled = true;
      if (btnNext) btnNext.disabled = true;
      return;
    }

    shell.hidden = false;
    if (countEl) countEl.textContent = `${docs.length} featured`;

    // NEW: Preload first slide image for immediate fetch
    const firstImg = docs?.[0]?.images?.[0];
    if (firstImg) preloadFirstImage(firstImg);

    // NEW: Pass index so slide 0 can be eager/high priority
    container.innerHTML = docs.map((b, i) => slideHTML(b, i)).join('');

    // (Re)init Embla on the VIEWPORT node
    if (embla) embla.destroy();
    const plugins = ClassNames ? [ClassNames({ snapped: 'is-selected' })] : [];
    embla = EmblaCarousel(
      viewport,
      {
        align: 'center',
        containScroll: 'trimSnaps',
        loop: true,
        dragFree: false,
      },
      plugins
    );

    // Dots
    dotsWrap.innerHTML = '';
    const dotBtns = embla.slideNodes().map((_, i) => {
      const b = document.createElement('button');
      b.className = 'embla__dot';
      b.type = 'button';
      b.addEventListener('click', () => embla.scrollTo(i));
      dotsWrap.appendChild(b);
      return b;
    });

    const updateUi = () => {
      const i = embla.selectedScrollSnap();
      dotBtns.forEach((d, idx) => d.classList.toggle('is-selected', idx === i));
      const multi = embla.slideNodes().length > 1;
      if (btnPrev) btnPrev.disabled = !multi || !embla.canScrollPrev();
      if (btnNext) btnNext.disabled = !multi || !embla.canScrollNext();
    };

    embla.on('init', updateUi);
    embla.on('select', updateUi);
    embla.on('reInit', updateUi);
    updateUi();
  }

  function onError(err) {
    console.error('carousel subscribe error:', err);
    const link = (String(err?.message || '').match(/https?:\/\/\S+/) || [])[0];
    document.getElementById('emblaContainer').innerHTML = `
      <div class="muted" style="padding:.6rem">
        The featured carousel needs a Firestore index.
        ${
          link
            ? `<a class="btn btn-secondary" href="${link}" target="_blank" rel="noopener">Create index</a>`
            : ''
        }
      </div>`;
  }

  // Initial subscribe/render
  resubscribe(render, onError);
}

// Allow main.js (tabs/search) to change the active category
export function setCarouselCategory(category) {
  currentCategory = category || null;
  // Re-subscribe only after initCarousel has run
  if (EmblaCarousel) resubscribe();
}

function resubscribe(renderOverride, errorOverride) {
  // (Re)subscribe to featured by current category
  if (unsubCarousel) {
    try {
      unsubCarousel();
    } catch {}
  }
  const shell = document.getElementById('homeCarousel');
  const container = document.getElementById('emblaContainer');

  const render =
    renderOverride ||
    ((docs) => {
      // Default render path for subsequent category changes
      const dotsWrap = document.getElementById('emblaDots');
      const btnPrev = document.getElementById('emblaPrev');
      const btnNext = document.getElementById('emblaNext');
      const countEl = document.getElementById('carouselCount');
      const viewport = document.getElementById('emblaViewport');

      if (!docs.length) {
        shell.hidden = true;
        container.innerHTML = '';
        if (embla) {
          embla.destroy();
          embla = null;
        }
        dotsWrap.innerHTML = '';
        if (btnPrev) btnPrev.disabled = true;
        if (btnNext) btnNext.disabled = true;
        return;
      }

      shell.hidden = false;
      if (countEl) countEl.textContent = `${docs.length} featured`;

      // NEW: Preload first slide image
      const firstImg = docs?.[0]?.images?.[0];
      if (firstImg) preloadFirstImage(firstImg);

      // NEW: Pass index to slideHTML
      container.innerHTML = docs.map((b, i) => slideHTML(b, i)).join('');

      if (embla) embla.destroy();
      const plugins = ClassNames
        ? [ClassNames({ snapped: 'is-selected' })]
        : [];
      embla = EmblaCarousel(
        viewport,
        {
          align: 'center',
          containScroll: 'trimSnaps',
          loop: true,
          dragFree: false,
        },
        plugins
      );

      dotsWrap.innerHTML = '';
      const dotBtns = embla.slideNodes().map((_, i) => {
        const b = document.createElement('button');
        b.className = 'embla__dot';
        b.type = 'button';
        b.addEventListener('click', () => embla.scrollTo(i));
        dotsWrap.appendChild(b);
        return b;
      });

      const updateUi = () => {
        const i = embla.selectedScrollSnap();
        dotBtns.forEach((d, idx) =>
          d.classList.toggle('is-selected', idx === i)
        );
        const multi = embla.slideNodes().length > 1;
        if (btnPrev) btnPrev.disabled = !multi || !embla.canScrollPrev();
        if (btnNext) btnNext.disabled = !multi || !embla.canScrollNext();
      };
      embla.on('init', updateUi);
      embla.on('select', updateUi);
      embla.on('reInit', updateUi);
      updateUi();
    });

  const onError =
    errorOverride ||
    ((err) => {
      console.error('carousel subscribe error:', err);
      const link = (String(err?.message || '').match(/https?:\/\/\S+/) ||
        [])[0];
      container.innerHTML = `
        <div class="muted" style="padding:.6rem">
          The featured carousel needs a Firestore index.
          ${
            link
              ? `<a class="btn btn-secondary" href="${link}" target="_blank" rel="noopener">Create index</a>`
              : ''
          }
        </div>`;
    });

  unsubCarousel = subscribeToCarousel(currentCategory, render, onError);
}

// ---- slide template & helpers ----
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

// NOTE: accepts index so we can set eager/lazy + fetchpriority accordingly
function slideHTML(b, idx) {
  const img = (b.images && b.images[0]) || './assets/placeholder.webp';
  const eager = idx === 0;
  const imgAttrs = eager
    ? 'loading="eager" fetchpriority="high" decoding="sync"'
    : 'loading="lazy" fetchpriority="low" decoding="async"';

  return `
    <div class="embla__slide">
      <article class="card card--featured">
        <img ${imgAttrs}
             src="${img}"
             alt="${escapeHtml(b.title || 'Book cover')}"
             width="200" height="300"
             style="width:100%;aspect-ratio:2/3;object-fit:contain;background:#1f2329;display:block;" />
        <div class="meta">
          <h3>${escapeHtml(b.title || 'Untitled')}</h3>
          ${
            b.condition
              ? `<p class="muted">Book condition : ${escapeHtml(
                  b.condition
                )}</p>`
              : ''
          }
          ${
            b.price != null
              ? `<p class="muted">My price : ₹${escapeHtml(
                  String(b.price)
                )}</p>`
              : ''
          }
          ${
            b.mrp != null
              ? `<p class="muted">MRP: ₹${escapeHtml(String(b.mrp))}</p>`
              : ''
          }

          <!-- WhatsApp CTA (now visible) -->
          <a class="btn" href="${waUrl(b)}" target="_blank" rel="noopener"
             aria-label="Message Srikar on WhatsApp about ${escapeHtml(
               b.title || 'this book'
             )}">
            Message on WhatsApp
          </a>
        </div>
      </article>
    </div>`;
}

// (ESM first, UMD fallback — pinned to a stable version)
async function loadEmbla() {
  try {
    const m = await import(
      'https://cdn.jsdelivr.net/npm/embla-carousel@8.6.0/esm/embla-carousel.esm.js'
    );
    return m.default || m;
  } catch {
    await inject(
      'https://cdn.jsdelivr.net/npm/embla-carousel@8.6.0/embla-carousel.umd.js'
    );
    return window.EmblaCarousel;
  }
}
async function loadClassNames() {
  try {
    const m = await import(
      'https://cdn.jsdelivr.net/npm/embla-carousel-class-names@8.6.0/esm/embla-carousel-class-names.esm.js'
    );
    return m.default || m;
  } catch {
    await inject(
      'https://cdn.jsdelivr.net/npm/embla-carousel-class-names@8.6.0/embla-carousel-class-names.umd.js'
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
