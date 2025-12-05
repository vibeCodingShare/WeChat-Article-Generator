
import { db } from './db';
import { HistoryItem } from '../types';

// Omit ID because Dexie will auto-generate it (or we generate it, but handled flexibly)
export const saveHistoryItem = async (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
  try {
    const newItem: HistoryItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      // Ensure images are stored. Dexie can handle structured cloning of objects.
      // We might want to strip the 'file' object if it's large and just keep base64, 
      // but keeping it simple for now as Dexie handles Blobs well.
      // However, for restore reliability, we primarily rely on base64.
      images: item.images.map(img => ({
          ...img,
          file: null, // Don't persist File object to avoid cloning issues if not needed
          previewUrl: '' // Clear old blob url as it expires
      }))
    };
    
    await db.history.add(newItem);
    
    // Optional: Keep only last 50 heavy items (with images)
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
  try {
    // Return sorted by newest first
    return await db.history.orderBy('timestamp').reverse().toArray();
  } catch (error) {
    console.error("Failed to load history:", error);
    return [];
  }
};

export const deleteHistoryItem = async (id: string) => {
  try {
    await db.history.delete(id);
    return await getHistory(); // Return updated list
  } catch (error) {
    console.error("Failed to delete history item:", error);
    return [];
  }
};

export const clearHistory = async () => {
    await db.history.clear();
};
