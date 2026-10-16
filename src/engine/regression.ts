// Регрессионная сверка: 4 эталонных кейса, пересчитанных в оригинальном
// Excel-калькуляторе (COM-автоматизация, октябрь 2026).
// Позволяет одной кнопкой убедиться, что движок (и импортированные справочники)
// дают те же итоги, что и Excel, после любого обновления данных.

import type { CalcInput, Totals } from './types';
import { computeRows, computeTotals } from './engine';

export interface RegressionCase {
  name: string;
  input: CalcInput;
  expected: Record<string, number | string>;
}

const s = (): CalcInput['steelAbove'] => [{ len: null, diam: null }, { len: null, diam: null }, { len: null, diam: null }];

function baseInput(): CalcInput {
  return {
    objectName: '', preparedBy: '',
    steelAbove: s(), steelOpen: s(), casing: s(), steelHDD: s(), pullST: s(), pipesST: s(),
    tpOpen: s(), tpHDD: s(), peOpen: s(), peHDD: s(), pullPE: s(), pipesPE: s(),
    grpb: null, grpsh: null, ehzLen: null, treesArea: null,
    areaType: 'Лесопарковые зоны населенных пунктов',
    point: { material: '', laying: '', pressure: null, diam: null },
  };
}

// Эталонные значения — ячейки листа «Итоги» оригинального калькулятора.
// Единицы: СМР/ПИР/итоги — тыс. руб. (F16=G3/1.22 и т.д.); ставки C7 — тыс. руб.
export const REGRESSION_CASES: RegressionCase[] = [
  {
    name: 'Кейс 1 — ПЭ 110 мм, 0,3 МПа; ГРПШ+ГРПБ, ЭХЗ, деревья (не лес)',
    input: {
      ...baseInput(),
      steelAbove: [{ len: 120, diam: 50 }, { len: 80, diam: 100 }, { len: null, diam: null }],
      steelOpen: [{ len: 250, diam: 150 }, { len: null, diam: null }, { len: null, diam: null }],
      casing: [{ len: 30, diam: 200 }, { len: null, diam: null }, { len: null, diam: null }],
      steelHDD: [{ len: 60, diam: 125 }, { len: null, diam: null }, { len: null, diam: null }],
      pullST: [{ len: 40, diam: 100 }, { len: null, diam: null }, { len: null, diam: null }],
      tpOpen: [{ len: 200, diam: 110 }, { len: null, diam: null }, { len: null, diam: null }],
      tpHDD: [{ len: 45, diam: 63 }, { len: null, diam: null }, { len: null, diam: null }],
      peOpen: [{ len: 300, diam: 160 }, { len: 150, diam: 63 }, { len: null, diam: null }],
      peHDD: [{ len: 50, diam: 110 }, { len: null, diam: null }, { len: null, diam: null }],
      pullPE: [{ len: 35, diam: 160 }, { len: null, diam: null }, { len: null, diam: null }],
      pipesPE: [{ len: 100, diam: 110 }, { len: 60, diam: 63 }, { len: null, diam: null }],
      grpb: 1, grpsh: 1, ehzLen: 25, treesArea: 500,
      point: { material: 'Полиэтилен', laying: '', pressure: 0.3, diam: 110 },
    },
    expected: {
      smr: 67152.3682, pir: 7835.3444, author: 15.6707, base: 75003.3833,
      profit: 25001.13, vat: 22000.99, mainTotal: 122005.5033,
      c71: 3.02126, c72: 10.02938, c7Total: 13.05064, c7Vat: 2.8711408, c7WithVat: 15.9217808,
      grand: 122021.42503677554, c71Punkt: '8.2.2.', c72Punkt: '9.2.2.',
    },
  },
  {
    name: 'Кейс 2 — сталь надземная, 0,005 МПа, Ду 89; лесной фонд, ГРПШ ×2',
    input: {
      ...baseInput(),
      steelAbove: [{ len: 100, diam: 80 }, { len: null, diam: null }, { len: null, diam: null }],
      steelOpen: [{ len: 180, diam: 100 }, { len: null, diam: null }, { len: null, diam: null }],
      casing: [{ len: 20, diam: 150 }, { len: null, diam: null }, { len: null, diam: null }],
      steelHDD: [{ len: 40, diam: 80 }, { len: null, diam: null }, { len: null, diam: null }],
      pullST: [{ len: 25, diam: 80 }, { len: null, diam: null }, { len: null, diam: null }],
      tpOpen: [{ len: 150, diam: 63 }, { len: null, diam: null }, { len: null, diam: null }],
      tpHDD: [{ len: 30, diam: 32 }, { len: null, diam: null }, { len: null, diam: null }],
      peOpen: [{ len: 200, diam: 110 }, { len: null, diam: null }, { len: null, diam: null }],
      peHDD: [{ len: 40, diam: 63 }, { len: null, diam: null }, { len: null, diam: null }],
      pullPE: [{ len: 20, diam: 110 }, { len: null, diam: null }, { len: null, diam: null }],
      pipesPE: [{ len: 80, diam: 160 }, { len: 40, diam: 225 }, { len: null, diam: null }],
      grpsh: 2, ehzLen: 15, treesArea: 800, areaType: 'Лесной фонд',
      point: { material: 'Сталь', laying: 'Надземная', pressure: 0.005, diam: 89 },
    },
    expected: {
      smr: 18170.981453530811, pir: 5652.8261936639356, author: 11.305652387327871, base: 23835.113299582074,
      profit: 7945.04, vat: 6991.63, mainTotal: 38771.783299582072,
      c71: 2.79191, c72: 7.30178, c7Total: 10.09369, c7Vat: 2.2206118, c7WithVat: 12.3143018,
      grand: 38784.097601382069, c71Punkt: '8.1.1.1.', c72Punkt: '9.1.1.1.',
    },
  },
  {
    name: 'Кейс 3 — сталь подземная, 0,6 МПа, Ду 273; лесной фонд, ГРПБ',
    input: {
      ...baseInput(),
      steelAbove: [{ len: 60, diam: 25 }, { len: null, diam: null }, { len: null, diam: null }],
      steelOpen: [{ len: 400, diam: 250 }, { len: 100, diam: 125 }, { len: null, diam: null }],
      casing: [{ len: 25, diam: 100 }, { len: null, diam: null }, { len: null, diam: null }],
      steelHDD: [{ len: 80, diam: 200 }, { len: null, diam: null }, { len: null, diam: null }],
      pullST: [{ len: 50, diam: 125 }, { len: null, diam: null }, { len: null, diam: null }],
      tpOpen: [{ len: 250, diam: 160 }, { len: null, diam: null }, { len: null, diam: null }],
      tpHDD: [{ len: 50, diam: 110 }, { len: null, diam: null }, { len: null, diam: null }],
      peOpen: [{ len: 350, diam: 225 }, { len: 120, diam: 32 }, { len: null, diam: null }],
      peHDD: [{ len: 65, diam: 160 }, { len: null, diam: null }, { len: null, diam: null }],
      pullPE: [{ len: 45, diam: 250 }, { len: null, diam: null }, { len: null, diam: null }],
      pipesPE: [{ len: 90, diam: 315 }, { len: 55, diam: 355 }, { len: null, diam: null }],
      grpb: 1, ehzLen: 30, treesArea: 1200, areaType: 'Лесной фонд',
      point: { material: 'Сталь', laying: 'Подземная', pressure: 0.6, diam: 273 },
    },
    expected: {
      smr: 68396.014192071612, pir: 7291.2358618688531, author: 14.582471723737706, base: 75701.8325256642,
      profit: 25233.94, vat: 22205.87, mainTotal: 123141.6425256642,
      c71: 7.40691, c72: 12.26743, c7Total: 19.67434, c7Vat: 4.3283548, c7WithVat: 24.0026948,
      grand: 123165.6452204642, c71Punkt: '8.1.2.13.', c72Punkt: '9.1.2.13.',
    },
  },
  {
    name: 'Кейс 4 — ПЭ 500 мм, 0,6 МПа; крупные диаметры, ГНБ Ду 400',
    input: {
      ...baseInput(),
      steelAbove: [{ len: 45, diam: 150 }, { len: 200, diam: 250 }, { len: null, diam: null }],
      steelOpen: [{ len: 320, diam: 200 }, { len: null, diam: null }, { len: null, diam: null }],
      casing: [{ len: 35, diam: 300 }, { len: null, diam: null }, { len: null, diam: null }],
      steelHDD: [{ len: 75, diam: 400 }, { len: null, diam: null }, { len: null, diam: null }],
      pullST: [{ len: 60, diam: 200 }, { len: null, diam: null }, { len: null, diam: null }],
      tpOpen: [{ len: 180, diam: 160 }, { len: null, diam: null }, { len: null, diam: null }],
      peOpen: [{ len: 280, diam: 160 }, { len: 220, diam: 250 }, { len: null, diam: null }],
      peHDD: [{ len: 55, diam: 250 }, { len: null, diam: null }, { len: null, diam: null }],
      pullPE: [{ len: 30, diam: 200 }, { len: null, diam: null }, { len: null, diam: null }],
      pipesPE: [{ len: 70, diam: 63 }, { len: 50, diam: 110 }, { len: null, diam: null }],
      grpsh: 1, ehzLen: 20, treesArea: 300,
      point: { material: 'Полиэтилен', laying: '', pressure: 0.6, diam: 500 },
    },
    expected: {
      smr: 33078.67433138792, pir: 5655.6689463114762, author: 11.311337892622953, base: 38745.654615592022,
      profit: 12915.22, vat: 11365.39, mainTotal: 63026.264615592023,
      c71: 6.26989, c72: 8.23033, c7Total: 14.50022, c7Vat: 3.1900484, c7WithVat: 17.6902684,
      grand: 63043.954883992024, c71Punkt: '8.2.6.', c72Punkt: '9.2.6.',
    },
  },
];

export interface CheckResult {
  key: string;
  label: string;
  expected: number | string;
  actual: number | string;
  pass: boolean;
}

export interface CaseResult {
  name: string;
  checks: CheckResult[];
  passed: boolean;
}

const METRICS: { key: keyof Totals & string; label: string; tol: number; isPunkt?: boolean }[] = [
  { key: 'smr', label: 'СМР без НДС', tol: 0.01 },
  { key: 'pir', label: 'ПИР без НДС', tol: 0.01 },
  { key: 'author', label: 'Авторский надзор', tol: 0.01 },
  { key: 'base', label: 'Итого главы 1–12', tol: 0.01 },
  { key: 'profit', label: 'Налог на прибыль', tol: 0.01 },
  { key: 'vat', label: 'НДС 22 %', tol: 0.01 },
  { key: 'mainTotal', label: 'Итого сводный', tol: 0.01 },
  { key: 'c71', label: 'C7.1', tol: 0.001 },
  { key: 'c72', label: 'C7.2', tol: 0.001 },
  { key: 'c7Total', label: 'C7.1+C7.2 без НДС', tol: 0.001 },
  { key: 'c7Vat', label: 'НДС по C7', tol: 0.001 },
  { key: 'c7WithVat', label: 'C7 с НДС', tol: 0.001 },
  { key: 'grand', label: 'ВСЕГО ПО РАСЧЕТУ', tol: 0.01 },
  { key: 'c71Punkt', label: 'Пункт C7.1', tol: 0, isPunkt: true },
  { key: 'c72Punkt', label: 'Пункт C7.2', tol: 0, isPunkt: true },
];

// Прогон одного кейса через движок с переданным набором справочников
// (позволяет проверять и импортированные версии НЦС/C7).
export function runRegressionCase(ref: Parameters<typeof computeRows>[0], c: RegressionCase): CaseResult {
  const rows = computeRows(ref, c.input);
  const t = computeTotals(ref, c.input, rows);
  const checks: CheckResult[] = METRICS.map((m) => {
    const actual = t[m.key as keyof Totals] as number | string;
    const expected = c.expected[m.key];
    const pass = m.isPunkt
      ? String(actual) === String(expected)
      : Math.abs(Number(actual) - Number(expected)) <= m.tol;
    return { key: m.key, label: m.label, expected, actual, pass };
  });
  return { name: c.name, checks, passed: checks.every((x) => x.pass) };
}
