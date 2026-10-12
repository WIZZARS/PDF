// ─── Template Storage — IndexedDB ────────────────────────────────────────────
import { openDB, type IDBPDatabase } from 'idb';
import type { Template } from '@/types';

const DB_NAME = 'pdf-personalizer';
const STORE = 'templates';
const VERSION = 1;

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    },
  });
}

export async function loadTemplates(): Promise<Template[]> {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function saveTemplate(template: Template): Promise<void> {
  const db = await getDB();
  await db.put(STORE, template);
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}
