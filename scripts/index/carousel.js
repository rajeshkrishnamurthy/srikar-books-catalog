// scripts/index/carousel.js
// Intent: "Endless carousel" presentation for Featured books.
// - Continuous auto-scroll reel (duplicates items to loop seamlessly)
// - Gradient-faded edges, pause on hover, reduced-motion friendly
// - No external libraries; keeps your existing Firestore subscription
//
// Works with: subscribeToCarousel(..) in scripts/index/catalogService.js
// Used by:    scripts/index/main.js → import { initCarousel } from './carousel.js'
//
// Tweakables (CSS variables):
//   --reel-duration : total time for one full cycle (auto-set, but you can override)
//   --reel-gap      : gap between cards
//   --reel-card-w   : min card width

import { subscribeToCarousel } from './catalogService.js';
import { settings } from '../config.js';

export function initCarousel() {
  injectCssOnce();
  const shell = buildShell();
  const track = shell.querySelector('#carouselReel');
  const count = shell.querySelector('#carouselCount');

  // Pause animation on hover/focus
  shell.addEventListener('mouseenter', () =>
    shell.classList.add('carousel--paused')
  );
  shell.addEventListener('mouseleave', () =>
    shell.classList.remove('carousel--paused')
  );
  shell.addEventListener('focusin', () =>
    shell.classList.add('carousel--paused')
  );
  shell.addEventListener('focusout', () =>
    shell.classList.remove('carousel--paused')
  );

  subscribeToCarousel(
    (docs) => {
      if (!docs.length) {
        shell.hidden = true;
        track.innerHTML = '';
        return;
      }
      shell.hidden = false;
      count.textContent = `${docs.length} featured`;

      // Build one set of cards then duplicate to loop seamlessly
      const once = docs.map(cardHTML).join('');
      track.innerHTML = once + once; // two copies side-by-side

      // Compute a sensible duration so speed feels consistent with content width
      // (duration = distance / pxPerSec; clamp between 18s and 60s)
      requestAnimationFrame(() => {
        const total = track.scrollWidth / 2; // width of one copy
        const pxPerSec = 120; // lower = slower, higher = faster
        const secs = Math.max(18, Math.min(60, Math.round(total / pxPerSec)));
        shell.style.setProperty('--reel-duration', secs + 's');
      });
    },
    (err) => {
      console.error('carousel subscribe error:', err);
      // Graceful hint if an index is missing
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

// -------------------- view helpers --------------------

function buildShell() {
  let shell = document.getElementById('homeCarousel');
  // Create or repurpose the existing shell
  if (!shell) {
    const main =
      document.querySelector('main.wrap') || document.querySelector('main');
    shell = document.createElement('section');
    shell.id = 'homeCarousel';
    main?.insertBefore(shell, main.firstChild);
  }
  shell.className = 'panel carousel carousel--reel';
  shell.setAttribute('aria-label', 'Featured books');
  shell.innerHTML = `
    <div class="carousel__head flex between">
      <strong>Featured</strong>
      <div class="muted" id="carouselCount"></div>
    </div>
    <div class="reel__mask" aria-roledescription="carousel">
      <div class="reel" id="carouselReel" role="list"></div>
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

  const msg = encodeURIComponent(
    `Hi Srikar, I was going through the book deals on your website and I found a book I liked - "${
      b.title
    }"${b.author ? ` by ${b.author}` : ''}. I would like to buy this book!`
  );
  const wa = `https://wa.me/${settings.whatsappNumber}?text=${msg}`;

  return `
  <article class="reel__card" role="listitem" tabindex="0">
    <div class="reel__imgWrap">
      <img loading="lazy" src="${img}" alt="${escapeHtml(
    b.title || 'Book cover'
  )}" />
    </div>
    <div class="reel__meta">
      <strong class="reel__title">${escapeHtml(b.title || 'Untitled')}</strong>
      ${
        b.author
          ? `<div class="reel__sub muted">by ${escapeHtml(b.author)}</div>`
          : ''
      }
      ${
        bits.length
          ? `<div class="reel__sub muted">${bits.join(' · ')}</div>`
          : ''
      }
      <a class="btn" href="${wa}" target="_blank" rel="noopener">Message on WhatsApp</a>
    </div>
  </article>`;
}

// -------------------- CSS (injected once) --------------------

function injectCssOnce() {
  if (document.getElementById('carousel-reel-css')) return;
  const css = `
  /* --- Endless reel carousel --- */
  #homeCarousel.carousel--reel { --reel-gap:.8rem; --reel-card-w:min(28vw, 260px); }
  #homeCarousel .carousel__head { margin-bottom:.3rem; }
  .reel__mask {
    overflow:hidden; position:relative;
    /* subtle peek and fade at edges */
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
            mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
  }
  .reel {
    display:flex; gap:var(--reel-gap);
    will-change: transform;
    animation: reel-scroll var(--reel-duration, 36s) linear infinite;
    padding-bottom:.2rem;
  }
  .carousel--paused .reel { animation-play-state: paused; }
  @keyframes reel-scroll { to { transform: translateX(-50%); } }

  /* cards */
  .reel__card {
    display:grid; grid-template-rows: auto 1fr;
    width: var(--reel-card-w);
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
  }
  .reel__card:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
  .reel__card:hover { transform: translateY(-4px); box-shadow: 0 14px 32px rgba(0,0,0,.35); border-color: rgba(255,255,255,.08); }

  .reel__imgWrap { background: #1f2329; }
  .reel__imgWrap img {
    width:100%;
    aspect-ratio: 2 / 3;
    object-fit: contain;
    display:block;
  }
  .reel__meta { padding:.7rem; display:grid; gap:.28rem; }
  .reel__title { font-size: 1rem; line-height:1.2; }

  /* Responsive sizing */
  @media (max-width: 720px) {
    #homeCarousel.carousel--reel { --reel-card-w:min(78vw, 340px); }
  }

  /* Respect user's reduced-motion preference */
  @media (prefers-reduced-motion: reduce) {
    .reel { animation: none; }
  }`;
  const style = document.createElement('style');
  style.id = 'carousel-reel-css';
  style.textContent = css;
  document.head.appendChild(style);
}
