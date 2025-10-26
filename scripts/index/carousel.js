// scripts/index/carousel.js — Embla behavior

import { subscribeToCarousel } from './catalogService.js';
import { settings } from '../config.js';

export async function initCarousel() {
  const shell = document.getElementById('homeCarousel');
  if (!shell) return;

  const viewport = shell.querySelector('#carouselViewport');
  const track = shell.querySelector('#carouselTrack');
  const countEl = shell.querySelector('#carouselCount');
  const prevBtn = shell.querySelector('#carouselPrev');
  const nextBtn = shell.querySelector('#carouselNext');

  const EmblaCarousel = await loadEmbla();

  let embla = null;
  let slides = [];
  const getSlides = () => Array.from(track.querySelectorAll('.spot__card'));

  const onSelect = () => {
    if (!embla) return;
    const i = embla.selectedScrollSnap();
    slides.forEach((s, idx) => s.classList.toggle('is-active', idx === i));
    prevBtn.disabled = !embla.canScrollPrev();
    nextBtn.disabled = !embla.canScrollNext();
  };

  const reInit = () => {
    if (embla) embla.destroy();
    embla = EmblaCarousel(viewport, {
      align: 'center',
      loop: false,
      containScroll: 'trimSnaps',
      dragFree: false,
      slidesToScroll: 1,
      inViewThreshold: 0.6,
    });
    slides = getSlides();
    embla.on('select', onSelect);
    embla.on('reInit', () => {
      slides = getSlides();
      onSelect();
    });
    onSelect();
  };

  // Buttons
  prevBtn.addEventListener('click', () => embla && embla.scrollPrev());
  nextBtn.addEventListener('click', () => embla && embla.scrollNext());

  // Click a card to center it
  track.addEventListener('click', (e) => {
    const card = e.target.closest('.spot__card');
    if (!card || !embla) return;
    const idx = slides.indexOf(card);
    if (idx !== -1) embla.scrollTo(idx);
  });

  // Keyboard arrows when viewport is focused
  viewport.addEventListener('keydown', (e) => {
    if (!embla) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      embla.scrollPrev();
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      embla.scrollNext();
    }
  });

  // Subscribe to featured books
  subscribeToCarousel(
    (docs) => {
      if (!docs.length) {
        shell.hidden = true;
        track.innerHTML = '';
        if (embla) embla.destroy();
        embla = null;
        return;
      }
      shell.hidden = false;
      countEl.textContent = `${docs.length} featured`;
      track.innerHTML = docs.map(cardHTML).join('');
      reInit();
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
      if (embla) embla.destroy();
      embla = null;
    }
  );
}

// ---------- helpers ----------

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

/**
 * Load Embla from CDN. Prefer ESM, fallback to UMD global.
 */
async function loadEmbla() {
  // ESM (preferred)
  try {
    const m = await import(
      'https://cdn.jsdelivr.net/npm/embla-carousel@latest/embla-carousel.esm.js'
    );
    return m.default || m;
  } catch (e) {
    // Fallback to UMD global
    await injectScript(
      'https://cdn.jsdelivr.net/npm/embla-carousel@latest/embla-carousel.umd.js'
    );
    if (!window.EmblaCarousel) throw new Error('Embla failed to load.');
    return window.EmblaCarousel;
  }
}

function injectScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
