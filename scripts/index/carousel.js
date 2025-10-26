// scripts/index/carousel.js
// Spotlight carousel (manual, no auto-scroll).
// - Centered big card; neighbors dimmed
// - Prev/Next buttons (outside the mask), click, drag/scroll, keyboard arrows
// - No content duplication
//
// Uses subscribeToCarousel(..) from catalogService.js, orchestrated by scripts/index/main.js.

import { subscribeToCarousel } from './catalogService.js';
import { settings } from '../config.js';

export function initCarousel() {
  injectCssOnce();
  const shell = buildShell();
  const viewport = shell.querySelector('#carouselViewport');
  const track = shell.querySelector('#carouselTrack');
  const countEl = shell.querySelector('#carouselCount');
  const prevBtn = shell.querySelector('#carouselPrev');
  const nextBtn = shell.querySelector('#carouselNext');

  let activeIndex = 0;

  // Helpers
  const getCards = () => Array.from(track.querySelectorAll('.spot__card'));
  const centerOf = (el) => el.offsetLeft + el.clientWidth / 2;
  const vCenter = () => viewport.scrollLeft + viewport.clientWidth / 2;

  function nearestIndex() {
    const cards = getCards();
    if (!cards.length) return 0;
    const vc = vCenter();
    let idx = 0,
      best = Infinity;
    cards.forEach((c, i) => {
      const d = Math.abs(centerOf(c) - vc);
      if (d < best) {
        best = d;
        idx = i;
      }
    });
    return idx;
  }

  function goTo(i) {
    const cards = getCards();
    if (!cards.length) return;
    const clamped = Math.max(0, Math.min(i, cards.length - 1));
    const card = cards[clamped];
    const left =
      card.offsetLeft - (viewport.clientWidth - card.clientWidth) / 2;
    viewport.scrollTo({ left, behavior: 'smooth' });
    activeIndex = clamped;
    updateActive();
  }

  function updateActive() {
    const cards = getCards();
    if (!cards.length) return;
    // If user hand-scrolled, lock to the center-most card.
    activeIndex = nearestIndex();
    cards.forEach((c, i) => {
      c.classList.toggle('is-active', i === activeIndex);
      c.classList.toggle('is-left', i < activeIndex);
      c.classList.toggle('is-right', i > activeIndex);
    });
    prevBtn.disabled = activeIndex <= 0;
    nextBtn.disabled = activeIndex >= cards.length - 1;
  }

  // Clamp side padding so the first card centers without huge blank space.
  function recalcEdgePad() {
    const first = track.querySelector('.spot__card');
    if (!first) return;
    const cardW = first.getBoundingClientRect().width;
    const vw = viewport.clientWidth;
    const raw = Math.max(0, (vw - cardW) / 2);
    const maxPad = cardW * 0.6; // at most ~0.6× card width of empty edge
    const pad = Math.min(raw, maxPad);
    track.style.setProperty('--edge-pad', pad + 'px');
  }

  // Inputs
  viewport.addEventListener('scroll', () => {
    if (!viewport._ticking) {
      viewport._ticking = true;
      requestAnimationFrame(() => {
        viewport._ticking = false;
        updateActive();
      });
    }
  });
  window.addEventListener('resize', () => {
    recalcEdgePad();
    updateActive();
  });

  prevBtn.addEventListener('click', () => goTo(activeIndex - 1));
  nextBtn.addEventListener('click', () => goTo(activeIndex + 1));

  track.addEventListener('click', (e) => {
    const card = e.target.closest('.spot__card');
    if (!card) return;
    const idx = getCards().indexOf(card);
    if (idx !== -1) goTo(idx);
  });

  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(activeIndex - 1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(activeIndex + 1);
    }
  });

  // Subscribe & render
  subscribeToCarousel(
    (docs) => {
      if (!docs.length) {
        shell.hidden = true;
        track.innerHTML = '';
        return;
      }
      shell.hidden = false;
      countEl.textContent = `${docs.length} featured`;
      track.innerHTML = docs.map(cardHTML).join('');

      // Compute side padding once we know actual card width, then center first.
      requestAnimationFrame(() => {
        recalcEdgePad();
        goTo(0);
      });
    },
    (err) => {
      console.error('carousel subscribe error:', err);
      const link = (String(err?.message || '').match(/https?:\/\/\S+/) ||
        [])[0];
      shell.hidden = false;
      track.innerHTML = `
        <div class="muted" style="padding:.6rem">
          The featured carousel needs a Firestore index.
          ${
            link
              ? `<a class="btn btn-secondary" href="${link}" target="_blank" rel="noopener">Create index</a>`
              : ''
          }
        </div>`;
    }
  );
}

// ---------- markup ----------

function buildShell() {
  let shell = document.getElementById('homeCarousel');
  if (!shell) {
    const main =
      document.querySelector('main.wrap') || document.querySelector('main');
    shell = document.createElement('section');
    shell.id = 'homeCarousel';
    main?.insertBefore(shell, main.firstChild);
  }
  shell.className = 'panel carousel carousel--spotlight';
  shell.setAttribute('aria-label', 'Featured books');
  shell.innerHTML = `
    <div class="carousel__head flex between">
      <strong>Featured</strong>
      <div class="muted" id="carouselCount"></div>
    </div>

    <div class="spot__viewport" id="carouselViewport" tabindex="0" aria-roledescription="carousel">
      <div class="spot__track" id="carouselTrack" role="list"></div>
    </div>

    <!-- NAV placed OUTSIDE the masked viewport so it is always visible -->
    <button class="spot__nav spot__nav--prev" id="carouselPrev" aria-label="Previous">‹</button>
    <button class="spot__nav spot__nav--next" id="carouselNext" aria-label="Next">›</button>
  `;
  shell.hidden = true;
  return shell;
}

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

function cardHTML(b) {
  const img = (b.images && b.images[0]) || './assets/placeholder.webp';
  const bits = [];
  if (b.price != null) bits.push(`₹${escapeHtml(String(b.price))}`);
  if (b.condition) bits.push(escapeHtml(b.condition));

  return `
  <article class="spot__card" role="listitem" tabindex="0">
    <div class="spot__imgWrap">
      <img loading="lazy" src="${img}" alt="${escapeHtml(
    b.title || 'Book cover'
  )}" />
    </div>
    <div class="spot__meta">
      <strong class="spot__title">${escapeHtml(b.title || 'Untitled')}</strong>
      ${b.author ? `<div class="muted">by ${escapeHtml(b.author)}</div>` : ''}
      ${bits.length ? `<div class="muted">${bits.join(' · ')}</div>` : ''}
      <a class="btn" href="${waUrl(
        b
      )}" target="_blank" rel="noopener">Message on WhatsApp</a>
    </div>
  </article>`;
}

// ---------- styles (injected once) ----------

function injectCssOnce() {
  if (document.getElementById('carousel-spotlight-css')) return;
  const css = `
  /* Spotlight carousel — presentation only. */
  #homeCarousel.carousel--spotlight { position: relative; }
  #homeCarousel .carousel__head { margin-bottom: .4rem; }

  .spot__viewport {
    position: relative;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    touch-action: pan-x;
    /* edge fade */
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
            mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
  }
  .spot__viewport:focus { outline: none; }

  .spot__track {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: var(--card-w, clamp(380px, 54vw, 560px)); /* your external --card-w overrides this */
    gap: var(--gap, 1rem);
    padding-inline: var(--edge-pad, 12px); /* computed in JS to avoid huge blanks */
  }

  .spot__card {
    scroll-snap-align: center;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    display: grid; grid-template-rows: auto 1fr;
    transform: scale(.92);
    opacity: .65;
    filter: saturate(.9) contrast(.95);
    transition: transform .35s ease, opacity .35s ease, filter .35s ease, box-shadow .35s ease, border-color .35s ease;
  }
  .spot__card.is-active {
    transform: scale(1) translateZ(0);
    opacity: 1;
    filter: none;
    box-shadow: 0 18px 42px rgba(0,0,0,.35);
    border-color: rgba(255,255,255,.10);
  }

  .spot__imgWrap { background:#1f2329; }
  .spot__imgWrap img { width:100%; aspect-ratio: 2 / 3; object-fit: contain; display:block; }
  .spot__meta { padding:.8rem; display:grid; gap:.3rem; }
  .spot__title { font-size: 1.15rem; line-height: 1.15; }

  /* Nav buttons: live outside the mask so they're always visible */
  .spot__nav {
    position: absolute;
    top: 50%; transform: translateY(-50%);
    width: 38px; height: 38px; display: grid; place-items: center;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: rgba(0,0,0,.35);
    color: var(--text);
    pointer-events: auto;
    backdrop-filter: blur(6px);
    z-index: 5;
  }
  .spot__nav--prev { left: .25rem; }
  .spot__nav--next { right: .25rem; }
  .spot__nav:disabled { opacity: .4; cursor: not-allowed; }

  /* Mobile width (your external --card-w can override this too) */
  @media (max-width: 720px) {
    .spot__track { grid-auto-columns: var(--card-w, min(86vw, 520px)); }
  }
  `;
  const style = document.createElement('style');
  style.id = 'carousel-spotlight-css';
  style.textContent = css;
  document.head.appendChild(style);
}
