// Unified Firebase bootstrap + re-exports for app-wide use.
// Intent: keep all CDN imports in one place so feature modules import from here.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit, // <-- added
  startAfter, // (optional export for future pagination)
  endBefore,
  Timestamp,
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js';

import { firebaseConfig } from '../config.js';

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

// --- singletons ---
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
const auth = getAuth(app);
const storage = getStorage(app);

// --- re-exports (one stop import for all modules) ---
export {
  app,
  db,
  auth,
  storage,
  // Firestore
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
  startAfter,
  endBefore,
  Timestamp,
  // Auth
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  // Storage
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
};
