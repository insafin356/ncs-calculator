// Глобальное состояние приложения: справочники (с переопределениями из IndexedDB),
// ввод расчёта, ЭХЗ, история.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import bundledJson from '../data/reference-data.json';
import type { CalcInput, C7Entry, EhzInput, NcsEntry, ReferenceData } from '../engine/types';
import { computeRows, computeTotals, emptyEhzInput, emptyInput } from '../engine/engine';
import { recalcSpr1 } from '../engine/ncsXml';
import {
  deleteHistory, listHistory, loadDraft, loadRef, rollbackRef, saveDraft, saveHistory, saveRef,
  type HistoryRecord, type RefVersion, type SprConst,
} from './db';

interface AppState {
  ref: ReferenceData;
  refMeta: { ncs15: RefVersion<NcsEntry[]> | null; c7: RefVersion<C7Entry[]> | null; consts: RefVersion<SprConst> | null };
  input: CalcInput;
  ehzInput: EhzInput;
  ehzLinked: boolean; // подставлять итог ЭХЗ в строку 92
  history: HistoryRecord[];
  rows: ReturnType<typeof computeRows>;
  totals: ReturnType<typeof computeTotals>;
  hasErrors: boolean;
  setInput: (updater: (prev: CalcInput) => CalcInput) => void;
  setEhzInput: (updater: (prev: EhzInput) => EhzInput) => void;
  setEhzLinked: (v: boolean) => void;
  importNcs: (entries: NcsEntry[], sourceName: string) => Promise<{ found: number; missing: string[] }>;
  importC7: (entries: C7Entry[], sourceName: string) => Promise<void>;
  saveConsts: (c: SprConst) => Promise<void>;
  rollback: (key: 'ncs15' | 'c7' | 'consts') => Promise<void>;
  saveToHistory: (name: string) => Promise<void>;
  loadFromHistory: (rec: HistoryRecord) => void;
  removeHistory: (id: string) => Promise<void>;
  resetAll: () => void;
}

const Ctx = createContext<AppState | null>(null);

const bundled = bundledJson as unknown as ReferenceData;

function buildRef(ncs: RefVersion<NcsEntry[]> | null, c7: RefVersion<C7Entry[]> | null, consts: RefVersion<SprConst> | null): ReferenceData {
  const ref: ReferenceData = structuredClone(bundled);
  if (ncs) {
    ref.ncs15 = ncs.data;
    const ncsByRow = new Map(ncs.data.map((n) => [n.row, n]));
    const prices = recalcSpr1(ref.spr1, ncsByRow, ref.sdr);
    for (const r of ref.spr1) r.price = prices.get(r.row) ?? r.price;
  }
  if (c7) ref.c7 = c7.data;
  if (consts) {
    ref.spr4 = { wirePrice: consts.data.wirePrice, grpF16: consts.data.grpF16, grpG16: consts.data.grpG16 };
    ref.spr7 = { valka: consts.data.valka, komp: consts.data.komp, uhod: consts.data.uhod };
  }
  return ref;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [refMeta, setRefMeta] = useState<{ ncs15: RefVersion<NcsEntry[]> | null; c7: RefVersion<C7Entry[]> | null; consts: RefVersion<SprConst> | null }>({ ncs15: null, c7: null, consts: null });
  const [input, setInputState] = useState<CalcInput>(emptyInput());
  const [ehzInput, setEhzInputState] = useState<EhzInput>(emptyEhzInput());
  const [ehzLinked, setEhzLinked] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [ncs15, c7, consts, draftCalc, draftEhz, draftLinked, hist] = await Promise.all([
        loadRef<NcsEntry[]>('ncs15'), loadRef<C7Entry[]>('c7'), loadRef<SprConst>('consts'),
        loadDraft<CalcInput>('calc'), loadDraft<EhzInput>('ehz'), loadDraft<boolean>('ehzLinked'),
        listHistory(),
      ]);
      setRefMeta({ ncs15, c7, consts });
      if (draftCalc) setInputState(draftCalc);
      if (draftEhz) setEhzInputState(draftEhz);
      if (draftLinked) setEhzLinked(draftLinked);
      setHistory(hist);
      setLoaded(true);
    })();
  }, []);

  const ref = useMemo(() => buildRef(refMeta.ncs15, refMeta.c7, refMeta.consts), [refMeta]);

  const setInput = useCallback((updater: (prev: CalcInput) => CalcInput) => {
    setInputState((prev) => {
      const next = updater(prev);
      void saveDraft('calc', next);
      return next;
    });
  }, []);

  const setEhzInput = useCallback((updater: (prev: EhzInput) => EhzInput) => {
    setEhzInputState((prev) => {
      const next = updater(prev);
      void saveDraft('ehz', next);
      return next;
    });
  }, []);

  const setEhzLinkedPersist = useCallback((v: boolean) => {
    setEhzLinked(v);
    void saveDraft('ehzLinked', v);
  }, []);

  // итог ЭХЗ подставляется в строку 92
  const effectiveInput = useMemo<CalcInput>(() => {
    if (!ehzLinked) return input;
    return { ...input, ehzLen: input.ehzLen }; // значение обновляется на экране ЭХЗ кнопкой
  }, [input, ehzLinked]);

  const rows = useMemo(() => computeRows(ref, effectiveInput), [ref, effectiveInput]);
  const totals = useMemo(() => computeTotals(ref, effectiveInput, rows), [ref, effectiveInput, rows]);
  const hasErrors = rows.some((r) => !Number.isFinite(r.smr) || !Number.isFinite(r.pir));

  const refreshMeta = useCallback(async () => {
    const [ncs15, c7, consts] = await Promise.all([
      loadRef<NcsEntry[]>('ncs15'), loadRef<C7Entry[]>('c7'), loadRef<SprConst>('consts'),
    ]);
    setRefMeta({ ncs15, c7, consts });
  }, []);

  const importNcs = useCallback(async (entries: NcsEntry[], sourceName: string) => {
    await saveRef('ncs15', entries, sourceName);
    await refreshMeta();
    return { found: entries.length, missing: [] as string[] };
  }, [refreshMeta]);

  const importC7 = useCallback(async (entries: C7Entry[], sourceName: string) => {
    await saveRef('c7', entries, sourceName);
    await refreshMeta();
  }, [refreshMeta]);

  const saveConsts = useCallback(async (c: SprConst) => {
    await saveRef('consts', c, 'ручное редактирование');
    await refreshMeta();
  }, [refreshMeta]);

  const rollback = useCallback(async (key: 'ncs15' | 'c7' | 'consts') => {
    await rollbackRef(key);
    await refreshMeta();
  }, [refreshMeta]);

  const saveToHistory = useCallback(async (name: string) => {
    const rec: HistoryRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      name: name || `Расчет ${new Date().toLocaleString('ru-RU')}`,
      input: effectiveInput, ehzInput: ehzLinked ? ehzInput : null,
      totals: { smr: totals.smr, pir: totals.pir, grand: totals.grand },
    };
    await saveHistory(rec);
    setHistory((h) => [rec, ...h]);
  }, [effectiveInput, ehzInput, ehzLinked, totals]);

  const loadFromHistory = useCallback((rec: HistoryRecord) => {
    setInputState(rec.input);
    void saveDraft('calc', rec.input);
    if (rec.ehzInput) { setEhzInputState(rec.ehzInput); void saveDraft('ehz', rec.ehzInput); setEhzLinked(true); void saveDraft('ehzLinked', true); }
  }, []);

  const removeHistory = useCallback(async (id: string) => {
    await deleteHistory(id);
    setHistory((h) => h.filter((r) => r.id !== id));
  }, []);

  const resetAll = useCallback(() => {
    const i = emptyInput();
    setInputState(i); void saveDraft('calc', i);
    const e = emptyEhzInput();
    setEhzInputState(e); void saveDraft('ehz', e);
  }, []);

  const value: AppState = {
    ref, refMeta, input, ehzInput, ehzLinked, history, rows, totals, hasErrors,
    setInput, setEhzInput, setEhzLinked: setEhzLinkedPersist,
    importNcs, importC7, saveConsts, rollback, saveToHistory, loadFromHistory, removeHistory, resetAll,
  };

  if (!loaded) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Загрузка…</div>;
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp вне AppProvider');
  return v;
}
