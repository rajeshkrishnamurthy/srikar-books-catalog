// scripts/index/catalogService.js
import {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  // limit, // optional cap if you want
} from '../lib/firebase.js';

// Site‑wide stream for the grid/search
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

// Category‑aware Featured for carousel
export function subscribeToCarousel(
  category /* string|null */,
  onNext,
  onError
) {
  const constraints = [
    where('status', '==', 'available'),
    where('featured', '==', true),
  ];
  if (category) constraints.push(where('category', '==', category));
  constraints.push(orderBy('featuredAt', 'desc'));
  // constraints.push(limit(12));

  const q = query(collection(db, 'books'), ...constraints);
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}
