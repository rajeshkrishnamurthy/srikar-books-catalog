// scripts/index/catalogService.js
// Intent: centralize Firestore reads for catalog & carousel.

import {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  // (Optional) If you already re-export `limit` from ../lib/firebase.js, you can import it and add to the query.
  // limit,
} from '../lib/firebase.js';

// Per-category book feed for the grid (unchanged)
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

// Global available feed (for site-wide search, if you use it)
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

// Featured for carousel — now category-aware
export function subscribeToCarousel(
  category /* string | null */,
  onNext,
  onError
) {
  const constraints = [
    where('status', '==', 'available'),
    where('featured', '==', true),
  ];
  if (category) constraints.push(where('category', '==', category));
  // Show newest featured first
  constraints.push(orderBy('featuredAt', 'desc'));
  // Optionally cap the count:
  // constraints.push(limit(12));

  const q = query(collection(db, 'books'), ...constraints);

  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}
