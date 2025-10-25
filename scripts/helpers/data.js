// Intent: normalization helpers for authors/ISBNs/keys used by admin flows.
export function normalizeAuthorName(str=''){
  return String(str).replace(/\u00A0/g,' ').trim().replace(/\s+/g,' ');
}
export function authorKeyFromName(str=''){
  const base = normalizeAuthorName(str).toLowerCase().replace(/[^a-z0-9 ]+/g,'').replace(/\s+/g,' ').trim();
  return base.replace(/ /g,'-').slice(0, 100);
}
export function onlyDigitsX(v=''){ return String(v||'').replace(/[^\dxX]/g,''); }
