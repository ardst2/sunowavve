import { getDb } from './firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, setDoc, getDoc, deleteDoc, where, getDocs } from 'firebase/firestore';
import { Song } from '../types';

const COLLECTION_NAME = 'songs';

// Helper to remove undefined fields because Firestore throws an error on them
const cleanData = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

export const saveSongToDb = async (song: Song) => {
  const db = getDb();
  if (!db) return; // Silent fail if no DB configured

  try {
    const safeSong = cleanData(song);
    // We use setDoc with the song.id as the document ID to prevent duplicates easily
    const songRef = doc(db, COLLECTION_NAME, safeSong.id);
    // Use merge: true to avoid overwriting fields like 'isLiked' if the song already exists
    await setDoc(songRef, safeSong, { merge: true });
  } catch (e) {
    console.error("Error saving song to DB:", e);
  }
};

export const updateSongInDb = async (songId: string, updates: Partial<Song>) => {
  const db = getDb();
  if (!db) return;

  try {
    const safeUpdates = cleanData(updates);
    const songRef = doc(db, COLLECTION_NAME, songId);
    await updateDoc(songRef, safeUpdates);
  } catch (e) {
    console.error("Error updating song in DB:", e);
  }
};

export const toggleSongLike = async (songId: string, currentLikeStatus: boolean) => {
  const db = getDb();
  if (!db) return;

  try {
    const songRef = doc(db, COLLECTION_NAME, songId);
    await updateDoc(songRef, {
      isLiked: !currentLikeStatus
    });
  } catch (e) {
    console.error("Error toggling like:", e);
  }
};

export const deleteSongFromDb = async (songId: string) => {
  const db = getDb();
  if (!db) return;

  try {
    const songRef = doc(db, COLLECTION_NAME, songId);
    await deleteDoc(songRef);
  } catch (e) {
    console.error("Error deleting song from DB:", e);
    throw e;
  }
};

// Remove temporary placeholder songs associated with a task
export const cleanupTempSongs = async (taskId: string) => {
  const db = getDb();
  if (!db) return;
  
  try {
    const q = query(collection(db, COLLECTION_NAME), where('taskId', '==', taskId));
    const snapshot = await getDocs(q);
    
    const deletePromises: Promise<void>[] = [];
    snapshot.forEach((doc) => {
      // Only delete local placeholders (IDs starting with temp-)
      if (doc.id.startsWith('temp-')) {
        deletePromises.push(deleteDoc(doc.ref));
      }
    });
    
    if (deletePromises.length > 0) {
       await Promise.all(deletePromises);
       console.log(`Cleaned up ${deletePromises.length} temp records for task ${taskId}`);
    }
  } catch (e) {
    console.error("Error cleaning up temp songs:", e);
  }
};

// Real-time listener
export const subscribeToSongs = (callback: (songs: Song[]) => void) => {
  const db = getDb();
  if (!db) {
    callback([]);
    return () => {}; // Return no-op unsubscribe
  }

  const q = query(collection(db, COLLECTION_NAME), orderBy('createTime', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const songs: Song[] = [];
    snapshot.forEach((doc) => {
      songs.push(doc.data() as Song);
    });
    callback(songs);
  }, (error) => {
    console.error("Firestore subscription error:", error);
  });

  return unsubscribe;
};

// Check if DB is configured
export const isDbConfigured = (): boolean => {
  return !!getDb();
};