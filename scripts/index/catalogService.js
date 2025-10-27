// scripts/index/catalogService.js
import {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from '../lib/firebase.js';

// Site‑wide stream (unchanged)
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

// Carousel stream: when category is falsy, do *not* create a query.
export function subscribeToCarousel(category, onNext, onError) {
  if (!category) {
    // Pause mode: no Firestore reads; clear the UI if you want.
    try {
      onNext([]);
    } catch {}
    return () => {};
  }
  const q = query(
    collection(db, 'books'),
    where('status', '==', 'available'),
    where('featured', '==', true),
    where('category', '==', category),
    orderBy('featuredAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}
