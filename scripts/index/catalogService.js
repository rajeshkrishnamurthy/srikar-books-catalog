// scripts/index/catalogService.js
import {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from '../lib/firebase.js';

const PUBLIC_FIELDS = [
  'title',
  'author',
  'category',
  'binding',
  'price',
  'mrp',
  'isbn',
  'condition',
  'description',
  'images',
  'imagePaths',
  'status',
  'featured',
  'featuredAt',
  'createdAt',
  'updatedAt',
  'tags',
];

function pickPublicFields(data = {}) {
  return PUBLIC_FIELDS.reduce((acc, key) => {
    if (data[key] !== undefined) acc[key] = data[key];
    return acc;
  }, {});
}

function mapPublicDoc(docSnap) {
  return { id: docSnap.id, ...pickPublicFields(docSnap.data() || {}) };
}

// Site‑wide stream (unchanged)
export function subscribeToAllAvailable(onNext, onError) {
  const q = query(
    collection(db, 'books'),
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map(mapPublicDoc)),
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
    (snap) => onNext(snap.docs.map(mapPublicDoc)),
    onError
  );
}
