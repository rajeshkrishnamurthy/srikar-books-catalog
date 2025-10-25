// Intent: small text utilities shared across pages.
export function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

export function compactText(s = '') {
  return String(s).replace(/\s+/g, ' ').trim();
}

export function stripHtmlAndSquash(s='') {
  const noHtml = String(s).replace(/<[^>]+>/g,' ');
  return noHtml.replace(/\s+/g,' ').trim();
}
