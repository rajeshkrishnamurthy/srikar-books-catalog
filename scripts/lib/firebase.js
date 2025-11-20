// scripts/lib/firebase.js
// Unified Firebase bootstrap + re-exports for browser (CDN modules only).
// Intent: keep all CDN imports in one place so feature modules import from here.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';

import {
  // Firestore (all from CDN — no bare "firebase/firestore" imports)
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
  limitToLast,
  startAfter,
  endBefore,
  getCountFromServer,
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

// --- singletons ---
const app = initializeApp(firebaseConfig);

// Enable a strong local cache that works across tabs
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

const auth = getAuth(app);
const storage = getStorage(app);

// --- re-exports (one-stop import for all modules) ---
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
  limitToLast,
  startAfter,
  endBefore,
  getCountFromServer,
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
