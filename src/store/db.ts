// Локальное хранилище: справочники (с версиями), черновик, история расчётов.

import { openDB, type IDBPDatabase } from 'idb';
import type { C7Entry, CalcInput, EhzInput, NcsEntry } from '../engine/types';

export interface RefVersion<T> {
  data: T;
  importedAt: number;
  sourceName: string;
}

export interface HistoryRecord {
  id: string;
  ts: number;
  name: string;
  input: CalcInput;
  ehzInput: EhzInput | null;
  totals: { smr: number; pir: number; grand: number };
}

export interface SprConst {
  wirePrice: number; grpF16: number; grpG16: number;
  valka: number; komp: number; uhod: number;
}

interface DB extends IDBPDatabase {
  // типы уточняются через методы ниже
}

let dbPromise: Promise<DB> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB('ncs-calc', 1, {
      upgrade(d) {
        d.createObjectStore('refs');   // key: 'ncs15' | 'c7' | 'consts'
        d.createObjectStore('draft');  // key: 'calc' | 'ehz'
        d.createObjectStore('history', { keyPath: 'id' });
      },
    }) as Promise<DB>;
  }
  return dbPromise;
}

export async function loadRef<T>(key: string): Promise<RefVersion<T> | null> {
  return (await (await db()).get('refs', key)) ?? null;
}

export async function saveRef<T>(key: string, data: T, sourceName: string): Promise<void> {
  const d = await db();
  const prev = (await d.get('refs', key)) as RefVersion<T> | undefined;
  // сохраняем предыдущую версию для отката
  if (prev) await d.put('refs', prev, `${key}:prev`);
  await d.put('refs', { data, importedAt: Date.now(), sourceName } satisfies RefVersion<T>, key);
}

export async function rollbackRef<T>(key: string): Promise<RefVersion<T> | null> {
  const d = await db();
  const prev = (await d.get('refs', `${key}:prev`)) as RefVersion<T> | undefined;
  if (!prev) return null;
  const cur = await d.get('refs', key);
  if (cur) await d.put('refs', cur, `${key}:prev`);
  await d.put('refs', prev, key);
  return prev;
}

export async function loadDraft<T>(key: string): Promise<T | null> {
  return (await (await db()).get('draft', key)) ?? null;
}

export async function saveDraft<T>(key: string, data: T): Promise<void> {
  await (await db()).put('draft', data, key);
}

export async function listHistory(): Promise<HistoryRecord[]> {
  const all = (await (await db()).getAll('history')) as HistoryRecord[];
  return all.sort((a, b) => b.ts - a.ts);
}

export async function saveHistory(rec: HistoryRecord): Promise<void> {
  await (await db()).put('history', rec);
}

export async function deleteHistory(id: string): Promise<void> {
  await (await db()).delete('history', id);
}

export type { NcsEntry, C7Entry };
