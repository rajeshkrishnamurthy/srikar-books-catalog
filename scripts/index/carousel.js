// scripts/index/carousel.js
// Spotlight carousel — behavior only (no HTML/CSS injection).

import { subscribeToCarousel } from './catalogService.js';
import { settings } from '../config.js';

export function initCarousel() {
  const shell = document.getElementById('homeCarousel');
  if (!shell) return;
  const viewport = shell.querySelector('#carouselViewport');
  const track = shell.querySelector('#carouselTrack');
  const countEl = shell.querySelector('#carouselCount');
  const prevBtn = shell.querySelector('#carouselPrev');
  const nextBtn = shell.querySelector('#carouselNext');

  let activeIndex = 0;

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
    // If the user hand-scrolled, snap our state to the nearest centered card
    activeIndex = nearestIndex();
    cards.forEach((c, i) => {
      c.classList.toggle('is-active', i === activeIndex);
      c.classList.toggle('is-left', i < activeIndex);
      c.classList.toggle('is-right', i > activeIndex);
    });
    prevBtn.disabled = activeIndex <= 0;
    nextBtn.disabled = activeIndex >= cards.length - 1;
  }

  // Compute side padding so first/last can center even on wide viewports
  function recalcEdgePad() {
    const first = track.querySelector('.spot__card');
    if (!first) return;
    const cardW = first.getBoundingClientRect().width;
    const vw = viewport.clientWidth;
    const pad = Math.max(0, (vw - cardW) / 2); // full required pad; no clamp
    track.style.setProperty('--edge-pad-left', pad + 'px');
    track.style.setProperty('--edge-pad-right', pad + 'px');
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
      // After paint: compute padding and center the first card
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
