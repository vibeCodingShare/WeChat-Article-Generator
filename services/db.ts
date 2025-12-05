
import { HistoryItem } from '../types';

// Define a minimal interface for the Table to avoid importing from 'dexie'
// This ensures NO static dependency on the library.
export interface DexieTable<T> {
  add(item: T): Promise<any>;
  count(): Promise<number>;
  orderBy(index: string): {
    limit(n: number): {
      keys(): Promise<any[]>;
    };
    reverse(): {
      toArray(): Promise<T[]>;
    };
  };
  bulkDelete(keys: any[]): Promise<void>;
  toArray(): Promise<T[]>;
  delete(key: any): Promise<void>;
  clear(): Promise<void>;
}

export interface InkFlowDatabaseShape {
  history: DexieTable<HistoryItem>;
}

let dbInstance: any | undefined;
let initAttempted = false;

/**
 * Lazy-load the database using Dynamic Imports.
 * This prevents the "Access to storage is not allowed" error from crashing the app 
 * during the initial bundle load in restricted environments (e.g. Vercel Preview, Incognito).
 */
export const getDb = async (): Promise<InkFlowDatabaseShape | undefined> => {
  if (dbInstance) return dbInstance;
  if (initAttempted) return undefined; // Prevent infinite retry loops if it failed once

  initAttempted = true;

  // 1. Strict Environment Check
  // In some iframes or server contexts, even checking indexedDB throws errors.
  try {
      if (typeof window === 'undefined') {
          return undefined;
      }
      // Accessing the property might throw SecurityError
      if (!window.indexedDB) {
          console.warn("IndexedDB not supported/available.");
          return undefined;
      }
  } catch (e) {
      console.warn("Accessing window.indexedDB blocked.", e);
      return undefined;
  }

  try {
    // 2. Dynamic Import
    // This ensures 'dexie' library code only runs when we actually need it.
    const DexieModule = await import('dexie');
    const Dexie = DexieModule.default;

    // 3. Define Schema at Runtime
    class InkFlowDB extends Dexie {
        history!: DexieTable<HistoryItem>;
        constructor() {
            super('InkFlowDB');
            (this as any).version(1).stores({
                history: '++id, timestamp, personaName'
            });
        }
    }

    // 4. Initialize
    dbInstance = new InkFlowDB();
    await (dbInstance as any).open();
    
    return dbInstance;
  } catch (e) {
    console.warn("IndexedDB initialization failed. History features will be disabled.", e);
    return undefined;
  }
};
