// Расчётный движок — точная реплика формул листов «Расчет» и «Итоги».
// Каждая функция ссылается на ячейки Excel, которые воспроизводит.

import type {
  ReferenceData, CalcInput, CalcRowResult, Totals, Section, EhzInput,
} from './types';

const VAT = 1.22; // НДС 22%, зашит в формулах книги

// Excel ROUND(x, 2) — округление половины от нуля
export function round2(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x) * 100) / 100;
}

const num = (v: number | null | undefined): number =>
  v === null || v === undefined || Number.isNaN(v) ? 0 : v;

// ---------- VLOOKUP (точное совпадение) ----------

function vlookup(block: { diam: number; price: number }[], diam: number): number | null {
  const d = Math.round(diam);
  const hit = block.find((r) => Math.round(r.diam) === d);
  return hit ? hit.price : null;
}

// ---------- MATCH(x, диапазон, 1): индекс (0-based) последнего значения <= x ----------

function matchAsc(x: number, arr: number[]): number {
  let idx = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] <= x) idx = i; else break;
  }
  return idx;
}

// ---------- Кусочно-линейная интерполяция по матрице (INDEX+MATCH) ----------
// Зеркало конструкции:
//   INDEX(vals, MIN(MATCH(len,lens,1), ROWS(lens)-1), col)
//   + (len - INDEX(lens, m)) * (INDEX(vals, m+1, col) - INDEX(vals, m, col))
//     / (INDEX(lens, m+1) - INDEX(lens, m))

function interpMatrix(
  len: number,
  lens: number[],
  vals: (number | null)[][],
  col: number, // 0-based
): number {
  const m = Math.min(matchAsc(len, lens), lens.length - 1);
  const v1 = vals[m]?.[col] ?? 0;
  const v2 = vals[m + 1]?.[col] ?? v1;
  const l1 = lens[m];
  const l2 = lens[m + 1];
  if (l2 === l1) return v1;
  return v1 + (len - l1) * (v2 - v1) / (l2 - l1);
}

// ---------- ПИР: матрица Справочник 2 ----------

// Расчет!H4 — СТ: колонка через VLOOKUP(диаметр, I2:J27, 2, FALSE) - 1;
// диапазон матрицы D:G, поэтому 0-based индекс = VLOOKUP - 2
function pirColByMap(m: { matrix: { len: number; vals: (number | null)[] }[]; diamCol: Record<string, number> }, diam: number): number | null {
  const c = m.diamCol[String(Math.round(diam))];
  if (c === undefined) return null;
  const col = c - 2;
  return col >= 0 && col < 4 ? col : null;
}

function pirByMatrix(m: { matrix: { len: number; vals: (number | null)[] }[]; diamCol: Record<string, number> }, len: number, col: number): number {
  return interpMatrix(len, m.matrix.map((r) => r.len), m.matrix.map((r) => r.vals), col);
}

// Расчет!H11..H15 — ПЭ сталь-подзем: колонка IF(diam<100,1,IF(diam<500,2,IF(diam<1000,3,4)))
function pirColPeSteel(diam: number): number {
  if (diam < 100) return 0;
  if (diam < 500) return 1;
  if (diam < 1000) return 2;
  return 3;
}

// Расчет!H53.. — ПИР ГНБ: колонка IF(diam<=500,1,IF(diam<=1000,2,3))
function pirColHdd(diam: number): number {
  if (diam <= 500) return 0;
  if (diam <= 1000) return 1;
  return 2;
}

// ---------- СМР ГНБ: MATCH("*Ду {diam},*", заголовки, 0) ----------

function hddColByHeader(headers: string[], diam: number): number | null {
  const needle = `Ду ${diam},`;
  const idx = headers.findIndex((h) => h.includes(needle));
  return idx < 0 ? null : idx;
}

// ---------- Справочник 1 СМР: блоки по строкам ----------

function spr1Block(ref: ReferenceData, from: number, to: number) {
  return ref.spr1.filter((r) => r.row >= from && r.row <= to)
    .map((r) => ({ diam: r.diam, price: r.price }));
}

// ---------- Точка подключения (C7.1/C7.2) ----------

const STEEL_DIAM_GROUPS: [number, string][] = [
  [0, 'до 100 мм'], [101, '101-158 мм'], [159, '159-218 мм'], [219, '219-272 мм'],
  [273, '273-324 мм'], [325, '325-425 мм'], [426, '426-529 мм'], [530, '530 мм и выше'],
];
const PE_DIAM_GROUPS: [number, string][] = [
  [0, '109 мм и менее'], [110, '110-159 мм'], [160, '160-224 мм'],
  [225, '225-314 мм'], [315, '315-399 мм'], [400, '400 мм и выше'],
];

export function pressureGroup(material: string, pressure: number): string | null {
  if (material === 'Сталь') return pressure <= 0.005 ? 'до 0,005 МПа' : '0,005-1,2 МПа';
  if (material === 'Полиэтилен') return pressure <= 0.6 ? 'до 0,6 МПа' : '0,6-1,2 МПа';
  return null;
}

export function diamGroup(material: string, diam: number): string | null {
  const table = material === 'Сталь' ? STEEL_DIAM_GROUPS : PE_DIAM_GROUPS;
  let g = table[0][1];
  for (const [min, name] of table) if (diam >= min) g = name;
  return g;
}

export function findC7Rate(ref: ReferenceData, type: 'C7.1' | 'C7.2', material: string, laying: string, pressure: number, diam: number) {
  const mat = material === 'Сталь' ? 'сталь' : 'полиэтилен';
  const lay = material === 'Полиэтилен' ? '-' : (laying === 'Надземная' ? 'надземная' : 'подземная');
  const pg = pressureGroup(material, pressure);
  const dg = diamGroup(material, diam);
  if (!pg || !dg) return null;
  const hit = ref.c7.find((e) =>
    e.type === type && e.material === mat && e.laying === lay &&
    e.pressure === pg && e.diam === dg);
  return hit ?? null;
}

// ---------- Основной расчёт ----------

export function computeRows(ref: ReferenceData, input: CalcInput): CalcRowResult[] {
  const rows: CalcRowResult[] = [];
  const push = (r: Omit<CalcRowResult, 'total'>) =>
    rows.push({ ...r, total: (Number.isFinite(r.smr) ? r.smr : 0) + (Number.isFinite(r.pir) ? r.pir : 0) });

  const filled = (s: Section) => num(s.len) > 0;

  // --- Сталь надземная (Расчет строки 4-9): G=VLOOKUP(diam,Спр1 C4:E11)*len; H=ПИР СТ ---
  {
    const block = spr1Block(ref, 4, 11);
    input.steelAbove.forEach((s, i) => {
      if (!filled(s)) return;
      const len = num(s.len), diam = num(s.diam);
      const price = vlookup(block, diam);
      const col = pirColByMap(ref.spr2st, diam);
      push({
        key: `steelAbove${i + 1}`,
        label: `Монтаж надземного газопровода (сталь), участок ${i + 1}`,
        source: 'Справочник 1 и 2', unit: 'м', volume: len, diam,
        smr: price === null ? NaN : price * len,
        pir: col === null ? NaN : pirByMatrix(ref.spr2st, len, col),
        error: price === null ? `Диаметр ${diam} не найден в Справочнике 1 (надземная)` : col === null ? `Диаметр ${diam} не найден в Справочнике 2 (СТ)` : undefined,
      });
    });
  }

  // --- Сталь подземная открытая (11-16): Спр1 C14:E29; ПИР ПЭ-таблица IF(diam<100,...) ---
  {
    const block = spr1Block(ref, 14, 29);
    input.steelOpen.forEach((s, i) => {
      if (!filled(s)) return;
      const len = num(s.len), diam = num(s.diam);
      const price = vlookup(block, diam);
      push({
        key: `steelOpen${i + 1}`,
        label: `Укладка СТ подземного газопровода (открытый способ), участок ${i + 1}`,
        source: 'Справочник 1 и 2', unit: 'м', volume: len, diam,
        smr: price === null ? NaN : price * len,
        pir: pirByMatrix(ref.spr2pe, len, pirColPeSteel(diam)),
        error: price === null ? `Диаметр ${diam} не найден в Справочнике 1 (сталь подзем)` : undefined,
      });
    });
  }

  // --- Стальные футляры (18-23): Спр1 C47:E58 ---
  {
    const block = spr1Block(ref, 47, 58);
    input.casing.forEach((s, i) => {
      if (!filled(s)) return;
      const len = num(s.len), diam = num(s.diam);
      const price = vlookup(block, diam);
      push({
        key: `casing${i + 1}`,
        label: `Устройство стального футляра, участок ${i + 1}`,
        source: 'Справочник 1', unit: 'м', volume: len, diam,
        smr: price === null ? NaN : price * len, pir: 0,
        error: price === null ? `Диаметр ${diam} не найден в Справочнике 1 (футляры)` : undefined,
      });
    });
  }

  // --- Сталь ГНБ (25-30): Спр3 val1 по hdr1; ПИР Спр3.pir ---
  input.steelHDD.forEach((s, i) => {
    if (!filled(s)) return;
    const len = num(s.len), diam = num(s.diam);
    const col = hddColByHeader(ref.spr3.hdr1, diam);
    push({
      key: `steelHDD${i + 1}`,
      label: `Устройство ННБ (сталь), участок ${i + 1}`,
      source: 'Справочник 3', unit: 'м', volume: len, diam,
      smr: col === null ? NaN : interpMatrix(len, ref.spr3.len1, ref.spr3.val1, col),
      pir: interpMatrix(len, ref.spr3.pir.map((r) => r.len), ref.spr3.pir.map((r) => r.vals), pirColHdd(diam)),
      error: col === null ? `Ду ${diam} не найден в Справочнике 3 (ГНБ сталь)` : undefined,
    });
  });

  // --- Протаскивание СТ в футляр (32-37): Спр5 b1 ---
  input.pullST.forEach((s, i) => {
    if (!filled(s)) return;
    const len = num(s.len), diam = num(s.diam);
    const price = vlookup(ref.spr5.b1, diam);
    push({
      key: `pullST${i + 1}`,
      label: `Протаскивание в футляр СТ труб, участок ${i + 1}`,
      source: 'Справочник 5', unit: 'м', volume: len, diam,
      smr: price === null ? NaN : price * len, pir: 0,
      error: price === null ? `Диаметр ${diam} не найден в Справочнике 5 (протаскивание СТ)` : undefined,
    });
  });

  // --- Стоимость СТ труб (39-44): Спр5 b3 ---
  input.pipesST.forEach((s, i) => {
    if (!filled(s)) return;
    const len = num(s.len), diam = num(s.diam);
    const price = vlookup(ref.spr5.b3, diam);
    push({
      key: `pipesST${i + 1}`,
      label: `Стоимость СТ труб, участок ${i + 1}`,
      source: 'Справочник 5', unit: 'м', volume: len, diam,
      smr: price === null ? NaN : price * len, pir: 0,
      error: price === null ? `Диаметр ${diam} не найден в Справочнике 5 (СТ трубы)` : undefined,
    });
  });

  // --- ПЭ ТП открытая (46-51): Спр6 b1; ПИР ПЭ VLOOKUP(MIN(diam,400)) ---
  input.tpOpen.forEach((s, i) => {
    if (!filled(s)) return;
    const len = num(s.len), diam = num(s.diam);
    const price = vlookup(ref.spr6.b1, diam);
    const col = pirColByMap(ref.spr2pe, Math.min(diam, 400));
    push({
      key: `tpOpen${i + 1}`,
      label: `Укладка ПЭ газопровода ТП (открытый способ), участок ${i + 1}`,
      source: 'Справочник 6', unit: 'м', volume: len, diam,
      smr: price === null ? NaN : price * len,
      pir: col === null ? NaN : pirByMatrix(ref.spr2pe, len, col),
      error: price === null ? `Диаметр ${diam} не найден в Справочнике 6` : col === null ? `Диаметр ${Math.min(diam, 400)} не найден в Справочнике 2 (ПЭ)` : undefined,
    });
  });

  // --- ПЭ ТП ГНБ (53-58): Спр6 b2; ПИР Спр3.pir col IF(diam<=500..) ---
  input.tpHDD.forEach((s, i) => {
    if (!filled(s)) return;
    const len = num(s.len), diam = num(s.diam);
    const price = vlookup(ref.spr6.b2, diam);
    push({
      key: `tpHDD${i + 1}`,
      label: `ННБ ТП ПЭ, участок ${i + 1}`,
      source: 'Справочник 6', unit: 'м', volume: len, diam,
      smr: price === null ? NaN : price * len,
      pir: interpMatrix(len, ref.spr3.pir.map((r) => r.len), ref.spr3.pir.map((r) => r.vals), pirColHdd(diam)),
      error: price === null ? `Диаметр ${diam} не найден в Справочнике 6 (ТП ГНБ)` : undefined,
    });
  });

  // --- ПЭ открытая (60-65): Спр1 C33:E43; ПИР ПЭ VLOOKUP(MIN(diam,400)) ---
  {
    const block = spr1Block(ref, 33, 43);
    input.peOpen.forEach((s, i) => {
      if (!filled(s)) return;
      const len = num(s.len), diam = num(s.diam);
      const price = vlookup(block, diam);
      const col = pirColByMap(ref.spr2pe, Math.min(diam, 400));
      push({
        key: `peOpen${i + 1}`,
        label: `Укладка ПЭ газопровода (открытый способ), участок ${i + 1}`,
        source: 'Справочник 1 и 2', unit: 'м', volume: len, diam,
        smr: price === null ? NaN : price * len,
        pir: col === null ? NaN : pirByMatrix(ref.spr2pe, len, col),
        error: price === null ? `Диаметр ${diam} не найден в Справочнике 1 (ПЭ)` : col === null ? `Диаметр ${Math.min(diam, 400)} не найден в Справочнике 2 (ПЭ)` : undefined,
      });
    });
  }

  // --- ПЭ ГНБ (67-72): Спр3 val3 по hdr3; ПИР Спр3.pir ---
  input.peHDD.forEach((s, i) => {
    if (!filled(s)) return;
    const len = num(s.len), diam = num(s.diam);
    const col = hddColByHeader(ref.spr3.hdr3, diam);
    push({
      key: `peHDD${i + 1}`,
      label: `Устройство ННБ (ПЭ), участок ${i + 1}`,
      source: 'Справочник 3', unit: 'м', volume: len, diam,
      smr: col === null ? NaN : interpMatrix(len, ref.spr3.len1, ref.spr3.val3, col),
      pir: interpMatrix(len, ref.spr3.pir.map((r) => r.len), ref.spr3.pir.map((r) => r.vals), pirColHdd(diam)),
      error: col === null ? `Ду ${diam} не найден в Справочнике 3 (ГНБ ПЭ)` : undefined,
    });
  });

  // --- Протаскивание ПЭ в футляр (74-79): Спр5 b2 ---
  input.pullPE.forEach((s, i) => {
    if (!filled(s)) return;
    const len = num(s.len), diam = num(s.diam);
    const price = vlookup(ref.spr5.b2, diam);
    push({
      key: `pullPE${i + 1}`,
      label: `Протаскивание в футляр ПЭ труб, участок ${i + 1}`,
      source: 'Справочник 5', unit: 'м', volume: len, diam,
      smr: price === null ? NaN : price * len, pir: 0,
      error: price === null ? `Диаметр ${diam} не найден в Справочнике 5 (протаскивание ПЭ)` : undefined,
    });
  });

  // --- Стоимость ПЭ труб (81-86): Спр5 b4; участки 2 и 3 с коэффициентом 1.1 ---
  input.pipesPE.forEach((s, i) => {
    if (!filled(s)) return;
    const len = num(s.len), diam = num(s.diam);
    const price = vlookup(ref.spr5.b4, diam);
    const k = i === 0 ? 1 : 1.1; // Excel: *1.1 только в строках 83 и 85
    push({
      key: `pipesPE${i + 1}`,
      label: `Стоимость ПЭ труб, участок ${i + 1}`,
      source: 'Справочник 5', unit: 'м', volume: len, diam,
      smr: price === null ? NaN : price * len * k, pir: 0,
      error: price === null ? `Диаметр ${diam} не найден в Справочнике 5 (ПЭ трубы)` : undefined,
    });
  });

  // --- ГРПБ (88): G=Спр4!F16*12.65*n; H=Спр4!G16*2*n ---
  if (num(input.grpb) > 0) {
    const n = num(input.grpb);
    const g = ref.spr4.grpF16 * 12.65 * n;
    push({ key: 'grpb', label: 'Монтаж ГРПБ', source: 'Справочник 4', unit: 'шт', volume: n, diam: 0, smr: g, pir: ref.spr4.grpG16 * 2 * n });
  }

  // --- ГРПШ (90): G=F16*n; H=G16*n ---
  if (num(input.grpsh) > 0) {
    const n = num(input.grpsh);
    push({ key: 'grpsh', label: 'Монтаж ГРПШ', source: 'Справочник 4', unit: 'шт', volume: n, diam: 0, smr: ref.spr4.grpF16 * n, pir: ref.spr4.grpG16 * n });
  }

  // --- ЭХЗ (92): G=E92*8500/1000; H=G*0.1 ---
  if (num(input.ehzLen) > 0) {
    const g = num(input.ehzLen) * 8500 / 1000;
    push({ key: 'ehz', label: 'ЭХЗ', source: 'Расчет ЭХЗ', unit: 'м', volume: num(input.ehzLen), diam: 0, smr: g, pir: g * 0.1 });
  }

  // --- Провод-спутник (94): E94=E57+E55+E53+E64+E62+E60 ---
  {
    const peLen = [input.tpHDD[2], input.tpHDD[1], input.tpHDD[0], input.peOpen[2], input.peOpen[1], input.peOpen[0]]
      .reduce((a, s) => a + num(s?.len), 0);
    if (peLen > 0) {
      const g = ref.spr4.wirePrice * peLen;
      push({ key: 'wire', label: 'Прокладка провода-спутника', source: 'Справочник 4', unit: 'м', volume: peLen, diam: 0, smr: g, pir: g * 0.1 });
    }
  }

  // --- Деревья (96/98/100) ---
  if (num(input.treesArea) > 0) {
    const a = num(input.treesArea);
    const forest = input.areaType === 'Лесной фонд';
    push({ key: 'valka', label: 'Валка деревьев', source: 'Справочник 7', unit: 'м²', volume: a, diam: 0, smr: ref.spr7.valka * a, pir: 0 });
    push({ key: 'komp', label: 'Компенсационное озеленение', source: 'Справочник 7', unit: 'м²', volume: a, diam: 0, smr: forest ? ref.spr7.komp * a / 3 : ref.spr7.komp * a, pir: 0 });
    push({ key: 'uhod', label: '3-х летний уход', source: 'Справочник 7', unit: 'м²', volume: a, diam: 0, smr: forest ? 0 : ref.spr7.uhod * a, pir: 0 });
  }

  return rows;
}

export function computeTotals(ref: ReferenceData, input: CalcInput, rows: CalcRowResult[]): Totals {
  const G3 = rows.reduce((a, r) => a + (Number.isFinite(r.smr) ? r.smr : 0), 0);
  const H3 = rows.reduce((a, r) => a + (Number.isFinite(r.pir) ? r.pir : 0), 0);

  // Итоги
  const F16 = G3 / VAT;
  const F20 = H3 / VAT;
  const F21 = F20 * 0.002;
  const F22 = F20 + F21;
  const F23 = F16 + F22;
  const F25 = round2(F23 / ((100 - 25) / 100) - F23);
  const F26 = round2((F23 + F25) * 22 / 100);
  const F27 = F25 + F26;
  const F28 = F23 + F27;

  // Точка подключения
  const p = input.point;
  const pointReady = p.material !== '' && p.pressure !== null && p.diam !== null &&
    !(p.material === 'Сталь' && p.laying === '') &&
    num(p.pressure) >= 0 && num(p.pressure) <= 1.2 && num(p.diam) > 0;
  let c71Rate: number | null = null, c72Rate: number | null = null;
  let c71Punkt = '', c72Punkt = '';
  let pg = '', dg = '';
  if (pointReady) {
    pg = pressureGroup(p.material!, num(p.pressure)) ?? '';
    dg = diamGroup(p.material!, num(p.diam)) ?? '';
    const r71 = findC7Rate(ref, 'C7.1', p.material!, p.laying || 'Подземная', num(p.pressure), num(p.diam));
    const r72 = findC7Rate(ref, 'C7.2', p.material!, p.laying || 'Подземная', num(p.pressure), num(p.diam));
    c71Rate = r71?.rate ?? null; c71Punkt = r71?.punkt ?? '';
    c72Rate = r72?.rate ?? null; c72Punkt = r72?.punkt ?? '';
  }
  const F30 = c71Rate !== null ? c71Rate / 1000 : 0;
  const F31 = c72Rate !== null ? c72Rate / 1000 : 0;
  const F32 = F30 + F31;
  const F33 = F32 * 0.22;
  const F34 = F32 + F33;
  const F35 = F28 + F34;

  return {
    smrWithVat: G3, pirWithVat: H3, totalWithVat: G3 + H3,
    smr: F16, pir: F20, author: F21, base: F23, profit: F25, vat: F26, mainTotal: F28,
    c71: F30, c72: F31, c7Total: F32, c7Vat: F33, c7WithVat: F34, grand: F35,
    c71Rate, c72Rate, c71Punkt, c72Punkt, pressureGroup: pg, diamGroup: dg,
  };
}

// ---------- ЭХЗ (лист «Расчет ЭХЗ») ----------

export const EHZ_POSITIONS = [
  'Станция катодной защиты (оборудование, монтаж, обвязка)',
  'Устройство глубинного анодного заземлителя, без анодов',
  'Устройство поверхностного анодного заземлителя, без анодов',
  'Устройство группового анодного заземлителя, без анодов',
  'Анодный элемент',
  'Кабельная линия от СКЗ до анодного заземлителя',
  'Кабельная линия от СКЗ до трубопровода',
  'Контрольно-измерительный пункт',
  'Электроизолирующее соединение',
  'Пусконаладочные работы',
  'Прочие работы по ЭХЗ',
];

export function computeEhz(input: EhzInput): { smr: number; pir: number; total: number; rows: { qty: number; price: number; coeff: number; cost: number }[] } {
  const q = (v: number | null) => num(v);
  // D22..D32 количества
  const qty = [
    q(input.skz),
    input.azType === 'Глубинное' ? q(input.azCount) : 0,
    input.azType === 'Поверхностное' ? q(input.azCount) : 0,
    input.azType === 'Групповое' ? q(input.azCount) : 0,
    q(input.azCount) * q(input.anodesPerAz),
    q(input.cableAz), q(input.cablePipe), q(input.kip), q(input.eis),
    q(input.pnr), 1,
  ];
  const coeff = input.prices.map((_, i) => (i === 10 ? 1 : q(input.actualCoeff) || 1.1));
  const rows = qty.map((quantity, i) => {
    const price = i === 10 ? num(input.other) : num(input.prices[i]);
    return { qty: quantity, price, coeff: coeff[i], cost: quantity * price * coeff[i] };
  });
  const smr = rows.reduce((a, r) => a + r.cost, 0);
  const pir = smr * q(input.pirCoeff);
  return { smr, pir, total: smr + pir, rows };
}

// Эквивалент ввода «ЭХЗ, м» (E92), при котором строка 92 даёт F92 = итогу ЭХЗ
export function ehzLenEquivalent(ehzTotal: number): number {
  return ehzTotal / (8500 / 1000) / 1.1;
}

export function emptyInput(): CalcInput {
  const s = (): Section[] => [{ len: null, diam: null }, { len: null, diam: null }, { len: null, diam: null }];
  return {
    objectName: '',
    steelAbove: s(), steelOpen: s(), casing: s(), steelHDD: s(), pullST: s(), pipesST: s(),
    tpOpen: s(), tpHDD: s(), peOpen: s(), peHDD: s(), pullPE: s(), pipesPE: s(),
    grpb: null, grpsh: null, ehzLen: null, treesArea: null,
    areaType: 'Лесопарковые зоны населенных пунктов',
    point: { material: '', laying: '', pressure: null, diam: null },
    preparedBy: '',
  };
}

export function emptyEhzInput(): EhzInput {
  return {
    protectedLen: null, sections: 1, skz: 1, azType: 'Глубинное', azCount: 1, anodesPerAz: 1,
    cableAz: null, cablePipe: null, kip: null, eis: null, pnr: 1,
    pirCoeff: 0.14627551, actualCoeff: 1.1, other: null,
    prices: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}
