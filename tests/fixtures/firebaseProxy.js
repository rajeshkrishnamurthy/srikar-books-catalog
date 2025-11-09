const firebaseImpl = (() => {
  const mod = globalThis.__firebaseMocks?.exports;
  if (!mod) {
    throw new Error(
      'Firebase mocks not initialized. Ensure createAdminAddHarness sets globalThis.__firebaseMocks before importing Firebase modules.'
    );
  }
  return mod;
})();

export const db = firebaseImpl.db;
export const storage = firebaseImpl.storage;
export const collection = firebaseImpl.collection;
export const addDoc = firebaseImpl.addDoc;
export const setDoc = firebaseImpl.setDoc;
export const updateDoc = firebaseImpl.updateDoc;
export const doc = firebaseImpl.doc;
export const getDoc = firebaseImpl.getDoc;
export const deleteDoc = firebaseImpl.deleteDoc;
export const serverTimestamp = firebaseImpl.serverTimestamp;
export const ref = firebaseImpl.ref;
export const uploadBytes = firebaseImpl.uploadBytes;
export const getDownloadURL = firebaseImpl.getDownloadURL;
export const deleteObject = firebaseImpl.deleteObject;
export const where = firebaseImpl.where;
export const orderBy = firebaseImpl.orderBy;
export const query = firebaseImpl.query;
export const onSnapshot = firebaseImpl.onSnapshot;
