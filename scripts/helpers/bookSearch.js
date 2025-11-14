import { compactText } from './text.js';

const normalizeIsbn = (value = '') =>
  String(value || '')
    .replace(/[^0-9xX]+/g, '')
    .toLowerCase();

const normalizeField = (value = '') => compactText(value || '').toLowerCase();

export function normalizeBookQuery(value = '') {
  return normalizeField(value);
}

export function isValidBookQuery(value = '') {
  const normalized = normalizeBookQuery(value);
  return normalized.length >= 2 && /[a-z0-9]/i.test(normalized);
}

export function bookMatchesQuery(book = {}, query = '') {
  const term = normalizeBookQuery(query);
  if (!term) return true;
  const title = normalizeField(book.title);
  const author = normalizeField(book.author);
  const isbn = normalizeIsbn(book.isbn);
  return [title, author, isbn].some((field) => field && field.includes(term));
}

export function buildBookSearchIndex(docs = []) {
  const seen = new Set();
  const entries = [];
  docs.forEach((doc) => {
    if (!doc || !doc.id) return;
    const normalizedTitle = compactText(doc.title || '');
    if (!normalizedTitle) return;
    if (seen.has(doc.id)) return;
    seen.add(doc.id);
    const titleLower = normalizedTitle.toLowerCase();
    entries.push({
      id: doc.id,
      title: normalizedTitle,
      tokens: titleLower.split(/\s+/),
      titleLower,
      authorLower: normalizeField(doc.author || ''),
      isbnNormalized: normalizeIsbn(doc.isbn),
      source: {
        ...doc,
        id: doc.id,
        title: normalizedTitle,
      },
    });
  });
  return entries;
}

export function rankBookMatches(index = [], query = '', maxResults = 5) {
  const normalizedQuery = normalizeBookQuery(query);
  if (!normalizedQuery) {
    return index.slice(0, maxResults);
  }
  const startsWithMatches = [];
  const containsMatches = [];
  index.forEach((entry) => {
    if (!bookMatchesQuery(entry.source, normalizedQuery)) {
      return;
    }
    if (entry.tokens.some((token) => token.startsWith(normalizedQuery))) {
      startsWithMatches.push(entry);
      return;
    }
    containsMatches.push(entry);
  });
  const combined = [...startsWithMatches, ...containsMatches];
  const results = [];
  const seen = new Set();
  combined.forEach((entry) => {
    if (seen.has(entry.id) || results.length >= maxResults) return;
    seen.add(entry.id);
    results.push(entry);
  });
  return results;
}
