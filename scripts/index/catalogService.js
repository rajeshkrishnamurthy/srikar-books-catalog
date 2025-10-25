// Intent: Firestore reads only; no DOM here. Keeps data concerns separate from UI.
import { db, collection, query, where, orderBy, onSnapshot } from '../lib/firebase.js';

export function subscribeToCategory(category, onData, onError) {
  const q = query(
    collection(db, 'books'),
    where('status', '==', 'available'),
    where('category', '==', category),
    orderBy('createdAt', 'desc')
  );
  // Return unsubscribe so caller can switch categories cleanly
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, onError);
}
