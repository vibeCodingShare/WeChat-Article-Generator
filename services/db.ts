
import Dexie, { Table } from 'dexie';
import { HistoryItem } from '../types';

export class InkFlowDatabase extends Dexie {
  history!: Table<HistoryItem>;

  constructor() {
    super('InkFlowDB');
    // Fix: Explicitly cast 'this' to any to avoid TS error 'Property version does not exist'
    (this as any).version(1).stores({
      history: '++id, timestamp, personaName'
    });
  }
}

// Singleton instance, but lazy loaded
let dbInstance: InkFlowDatabase | undefined;
let initAttempted = false;

/**
 * Lazy-load the database. 
 * This prevents the "Access to storage is not allowed" error from crashing the app 
 * during the initial bundle load in restricted environments (e.g. Vercel Preview, Incognito).
 */
export const getDb = async (): Promise<InkFlowDatabase | undefined> => {
  if (dbInstance) return dbInstance;
  if (initAttempted) return undefined; // Prevent infinite retry loops if it failed once

  initAttempted = true;

  // Check for environment support before trying
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
      console.warn("IndexedDB not supported in this environment.");
      return undefined;
  }

  try {
    dbInstance = new InkFlowDatabase();
    // Verify connection (optional, but good for catching immediate blockers)
    // Fix: Explicitly cast to any to avoid TS error 'Property open does not exist'
    await (dbInstance as any).open();
    return dbInstance;
  } catch (e) {
    console.warn("IndexedDB initialization failed. History features will be disabled.", e);
    return undefined;
  }
};
