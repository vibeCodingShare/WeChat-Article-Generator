
import { getDb } from './db';
import { HistoryItem } from '../types';

// Omit ID because Dexie will auto-generate it
export const saveHistoryItem = async (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
  const db = await getDb();
  if (!db) {
      // Graceful degradation: If DB is blocked, just don't save history. App continues working.
      console.warn("Storage is disabled. History item not saved.");
      return;
  }
  try {
    const newItem: HistoryItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      // Ensure images are stored. Dexie can handle structured cloning of objects.
      images: item.images.map(img => ({
          ...img,
          file: null, // Don't persist File object
          previewUrl: '' // Clear old blob url
      }))
    };
    
    await db.history.add(newItem);
    
    // Optional: Keep only last 50 items
    const count = await db.history.count();
    if (count > 50) {
        const oldest = await db.history.orderBy('timestamp').limit(count - 50).keys();
        await db.history.bulkDelete(oldest as string[]);
    }
  } catch (error) {
    console.error("Failed to save history to IndexedDB:", error);
  }
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.history.orderBy('timestamp').reverse().toArray();
  } catch (error) {
    console.error("Failed to load history:", error);
    return [];
  }
};

export const deleteHistoryItem = async (id: string) => {
  const db = await getDb();
  if (!db) return [];
  try {
    await db.history.delete(id);
    return await getHistory(); 
  } catch (error) {
    console.error("Failed to delete history item:", error);
    return [];
  }
};

export const clearHistory = async () => {
    const db = await getDb();
    if (!db) return;
    try {
        await db.history.clear();
    } catch (e) {
        console.error("Failed to clear history", e);
    }
};
