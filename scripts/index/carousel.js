// Intent: Subscribe to featured books and render a CSS scroll-snap carousel with no external deps.
import { subscribeToCarousel } from './catalogService.js';
import { settings } from '../config.js';

function injectCssOnce() {
  if (document.getElementById('carousel-css')) return;
  const css = `
  .carousel { position: relative; overflow: hidden; margin-bottom: .8rem; }
  .carousel__head { margin-bottom: .4rem; }
  .carousel__viewport {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(220px, 28vw);
    gap: .8rem;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: .2rem;
  }
  @media (max-width: 720px) { .carousel__viewport { grid-auto-columns: minmax(68%, 78%); } }
  .carousel__viewport::-webkit-scrollbar { height: 6px; }
  .carousel__viewport::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }
  .carousel__card {
    scroll-snap-align: start;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    display: grid;
  }
  .carousel__card img {
    width: 100%;
    aspect-ratio: 2 / 3;
    object-fit: contain;
    background: #1f2329;
    display: block;
  }
  .carousel__meta { padding: .7rem; display: grid; gap: .25rem; }
  .carousel__nav {
    position: absolute; inset: 0; pointer-events: none;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 .2rem;
  }
  .carousel__btn {
    pointer-events: auto;
    border: 1px solid var(--border);
    background: rgba(0,0,0,.35);
    color: var(--text);
    border-radius: 999px;
    width: 34px; height: 34px;
    display: grid; place-items: center;
    backdrop-filter: blur(6px);
  }`;
  const style = document.createElement('style');
  style.id = 'carousel-css';
  style.textContent = css;
  document.head.appendChild(style);
}

function buildShellIfMissing() {
  let shell = document.getElementById('homeCarousel');
  if (shell) return shell;

  const main =
    document.querySelector('main.wrap') || document.querySelector('main');
  shell = document.createElement('section');
  shell.id = 'homeCarousel';
  shell.className = 'carousel panel';
  shell.setAttribute('aria-label', 'Featured books');
  shell.hidden = true;

  shell.innerHTML = `
    <div class="carousel__head flex between">
      <strong>Featured</strong>
      <div class="muted" id="carouselCount"></div>
    </div>
    <div class="carousel__viewport" id="carouselTrack" tabindex="0" aria-roledescription="carousel"></div>
    <div class="carousel__nav">
      <button class="carousel__btn" id="carouselPrev" aria-label="Previous">‹</button>
      <button class="carousel__btn" id="carouselNext" aria-label="Next">›</button>
    </div>
  `;
  main?.insertBefore(shell, main.firstChild);
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
  const lines = [];
  if (b.price != null) lines.push(`₹${escapeHtml(String(b.price))}`);
  if (b.condition) lines.push(escapeHtml(b.condition));

  const msg = encodeURIComponent(
    `Hi Srikar, I was going through the book deals on your website and I found a book I liked - "${
      b.title
    }"${b.author ? ` by ${b.author}` : ''}. I would like to buy this book!`
  );
  const wa = `https://wa.me/${settings.whatsappNumber}?text=${msg}`;

  return `
  <article class="carousel__card">
    <img loading="lazy" src="${img}" alt="${escapeHtml(
    b.title || 'Book cover'
  )}" />
    <div class="carousel__meta">
      <strong>${escapeHtml(b.title || 'Untitled')}</strong>
      ${b.author ? `<div class="muted">by ${escapeHtml(b.author)}</div>` : ''}
      ${lines.length ? `<div class="muted">${lines.join(' · ')}</div>` : ''}
      <a class="btn" href="${wa}" target="_blank" rel="noopener">Message on WhatsApp</a>
    </div>
  </article>`;
}

function scrollByCard(track, dir = 1) {
  const firstCard = track?.querySelector('.carousel__card');
  if (!firstCard) return;
  const dx = (firstCard.getBoundingClientRect().width + 12) * dir;
  track.scrollBy({ left: dx, behavior: 'smooth' });
}

export function initCarousel() {
  injectCssOnce();
  const shell = buildShellIfMissing();
  const track = shell.querySelector('#carouselTrack');
  const count = shell.querySelector('#carouselCount');
  const prev = shell.querySelector('#carouselPrev');
  const next = shell.querySelector('#carouselNext');

  subscribeToCarousel(
    (docs) => {
      if (!docs.length) {
        shell.hidden = true;
        track.innerHTML = '';
        return;
      }
      shell.hidden = false;
      count.textContent = `${docs.length} featured`;
      track.innerHTML = docs.map(cardHTML).join('');
    },
    (err) => console.error('carousel subscribe error:', err)
  );

  prev?.addEventListener('click', () => scrollByCard(track, -1));
  next?.addEventListener('click', () => scrollByCard(track, 1));
}
