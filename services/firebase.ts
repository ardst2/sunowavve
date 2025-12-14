import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyCvDMmxlmf5aBzdS26N2HCOi5d89AUUrXk",
  authDomain: "studio-6846535182-aebf4.firebaseapp.com",
  projectId: "studio-6846535182-aebf4",
  storageBucket: "studio-6846535182-aebf4.firebasestorage.app",
  messagingSenderId: "396017852520",
  appId: "1:396017852520:web:8000fc8690f1e03e7edbdd"
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

export const initFirebase = () => {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      storage = getStorage(app);
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      return null;
    }
  } else {
    app = getApp();
    db = getFirestore(app);
    storage = getStorage(app);
  }

  return { app, db, storage };
};

export const getDb = (): Firestore | null => {
  if (db) return db;
  const instance = initFirebase();
  return instance ? instance.db : null;
};

export const getStorageInstance = (): FirebaseStorage | null => {
  if (storage) return storage;
  const instance = initFirebase();
  return instance ? instance.storage : null;
};
