import Dexie, { Table } from 'dexie';
import { HistoryItem } from '../types';

export class InkFlowDatabase extends Dexie {
  history!: Table<HistoryItem>;

  constructor() {
    super('InkFlowDB');
    // Fix: Explicitly cast 'this' to any to avoid TS error 'Property version does not exist'
    // This resolves issues where Dexie type definitions might not align with strict property initialization or extension.
    (this as any).version(1).stores({
      history: '++id, timestamp, personaName' // Primary key and indexed props
    });
  }
}

export const db = new InkFlowDatabase();