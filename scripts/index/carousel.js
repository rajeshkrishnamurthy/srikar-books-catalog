// scripts/index/carousel.js
// Intent: Spotlight carousel (manual, no auto-scroll).
// - One centered, large card; neighbors dimmed
// - Manual controls: prev/next buttons, click, drag/scroll, keyboard arrows
// - No item duplication; smooth, accessible; reduced-motion respected by OS
//
// Works with: subscribeToCarousel(..) in scripts/index/catalogService.js
// Used by:    scripts/index/main.js → import { initCarousel } from './carousel.js'

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

  let docs = [];
  let activeIndex = 0;

  // Navigation helpers
  function getCards() {
    return Array.from(track.querySelectorAll('.spot__card'));
  }
  function centerOf(el) {
    return el.offsetLeft + el.clientWidth / 2;
  }
  function viewportCenter() {
    return viewport.scrollLeft + viewport.clientWidth / 2;
  }

  function nearestIndex() {
    const cards = getCards();
    if (!cards.length) return 0;
    const vc = viewportCenter();
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
    // If the user scrolled by hand, recompute the closest card to center
    activeIndex = nearestIndex();
    cards.forEach((c, i) => {
      c.classList.toggle('is-active', i === activeIndex);
      c.classList.toggle('is-left', i < activeIndex);
      c.classList.toggle('is-right', i > activeIndex);
    });
    updateNavState();
  }

  function updateNavState() {
    prevBtn.disabled = activeIndex <= 0;
    nextBtn.disabled = activeIndex >= getCards().length - 1;
  }

  // Wire inputs
  viewport.addEventListener('scroll', () => {
    // throttle using rAF so we don't do work on every pixel
    if (!viewport._ticking) {
      viewport._ticking = true;
      requestAnimationFrame(() => {
        viewport._ticking = false;
        updateActive();
      });
    }
  });
  window.addEventListener('resize', () => updateActive());

  prevBtn.addEventListener('click', () => goTo(activeIndex - 1));
  nextBtn.addEventListener('click', () => goTo(activeIndex + 1));

  // Click on any side card to snap it to center
  track.addEventListener('click', (e) => {
    const card = e.target.closest('.spot__card');
    if (!card) return;
    const idx = getCards().indexOf(card);
    if (idx !== -1) goTo(idx);
  });

  // Keyboard arrows
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
    (arr) => {
      docs = arr || [];
      if (!docs.length) {
        shell.hidden = true;
        track.innerHTML = '';
        return;
      }
      shell.hidden = false;
      countEl.textContent = `${docs.length} featured`;

      track.innerHTML = docs.map(cardHTML).join('');
      // Ensure first item is centered on first render
      requestAnimationFrame(() => {
        goTo(0);
      });
    },
    (err) => {
      console.error('carousel subscribe error:', err);
      // Friendly hint if index is missing
      const m = String(err?.message || '');
      const link = (m.match(/https?:\/\/\S+/) || [])[0];
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

// ---------- view ----------

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

      <button class="spot__nav" id="carouselPrev" aria-label="Previous">‹</button>
      <button class="spot__nav" id="carouselNext" aria-label="Next">›</button>
    </div>
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

function waUrl(b) {
  const msg = encodeURIComponent(
    `Hi Srikar, I was going through the book deals on your website and I found a book I liked - "${
      b.title
    }"${b.author ? ` by ${b.author}` : ''}. I would like to buy this book!`
  );
  return `https://wa.me/${settings.whatsappNumber}?text=${msg}`;
}

// ---------- styles (injected once) ----------

function injectCssOnce() {
  if (document.getElementById('carousel-spotlight-css')) return;
  const css = `
  /* --- Spotlight carousel --- */
  #homeCarousel.carousel--spotlight { --card-w: clamp(200px, 54vw, 240px); --gap: 1rem; }
  #homeCarousel .carousel__head { margin-bottom: .4rem; }

  .spot__viewport {
    position: relative;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    /* edge fade */
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
            mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
  }
  .spot__viewport:focus { outline: none; }

  .spot__track {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: var(--card-w);
    gap: var(--gap);
    padding: 0 calc((100% - var(--card-w)) / 2); /* center first/last card */
  }

  .spot__card {
    scroll-snap-align: center;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr;
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
  .spot__imgWrap img {
    width: 100%;
    aspect-ratio: 2 / 3;
    object-fit: contain;
    display: block;
  }
  .spot__meta { padding: .8rem; display: grid; gap: .3rem; }
  .spot__title { font-size: 1.15rem; line-height: 1.15; }

  /* nav buttons */
  .spot__nav {
    position: absolute;
    top: 50%;
    translate: 0 -50%;
    width: 38px; height: 38px;
    display: grid; place-items: center;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: rgba(0,0,0,.35);
    color: var(--text);
    pointer-events: auto;
    backdrop-filter: blur(6px);
  }
  #carouselPrev { left: .25rem; }
  #carouselNext { right: .25rem; }
  .spot__nav:disabled { opacity: .4; cursor: not-allowed; }

  /* mobile sizing */
  @media (max-width: 720px) {
    #homeCarousel.carousel--spotlight { --card-w: min(86vw, 520px); }
  }
  `;
  const style = document.createElement('style');
  style.id = 'carousel-spotlight-css';
  style.textContent = css;
  document.head.appendChild(style);
}
