// Intent: Initialize Firebase once and re-export the SDK pieces pages need.
// Keeping this here avoids repeating CDN imports and app bootstrap across pages.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {
  getFirestore, collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js';
import { firebaseConfig } from '../config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export {
  // Instances
  app, db, auth, storage,
  // Firestore
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, serverTimestamp,
  // Auth
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  // Storage
  ref, uploadBytes, getDownloadURL, deleteObject
};
