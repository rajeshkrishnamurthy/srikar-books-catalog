import {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from '../lib/firebase.js';

// Per-category (existing)
export function subscribeToCategory(category, onNext, onError) {
  const q = query(
    collection(db, 'books'),
    where('status', '==', 'available'),
    where('category', '==', category),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

// Global "all available" (for site-wide search)
export function subscribeToAllAvailable(onNext, onError) {
  const q = query(
    collection(db, 'books'),
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

// NEW: Featured for carousel
export function subscribeToCarousel(onNext, onError) {
  const q = query(
    collection(db, 'books'),
    where('status', '==', 'available'),
    where('featured', '==', true),
    orderBy('featuredAt', 'desc'),
    limit(12) // small & fast
  );
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}
