
import { getDb } from './db';
import { HistoryItem } from '../types';

// Omit ID because Dexie will auto-generate it (if not provided)
// But for our use case, we generate UUIDs, so we use bulkPut to allow upserts.
export const saveHistoryItem = async (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
  const db = await getDb();
  if (!db) {
      // Graceful degradation
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
    
    // Optional: Keep only last 50 items to prevent bloat
    const count = await db.history.count();
    if (count > 50) {
        const keys = await db.history.orderBy('timestamp').limit(count - 50).keys();
        await db.history.bulkDelete(keys);
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

// --- Backup & Restore Features ---

export const exportDatabase = async (): Promise<string> => {
    const db = await getDb();
    if (!db) return "[]";
    try {
        const allItems = await db.history.toArray();
        return JSON.stringify(allItems, null, 2);
    } catch (e) {
        console.error("Export failed", e);
        throw new Error("Failed to export database");
    }
};

export const importDatabase = async (jsonString: string): Promise<number> => {
    const db = await getDb();
    if (!db) return 0;
    try {
        const items = JSON.parse(jsonString);
        if (!Array.isArray(items)) {
            throw new Error("Invalid backup file format: Root is not an array.");
        }
        
        // Basic validation
        const validItems = items.filter((i: any) => i.id && i.timestamp && i.generatedContent);
        
        if (validItems.length === 0) return 0;

        // Use bulkPut to update existing items (by ID) or insert new ones
        await (db.history as any).bulkPut(validItems);
        
        return validItems.length;
    } catch (e) {
        console.error("Import failed", e);
        throw e;
    }
};
