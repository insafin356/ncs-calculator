// Импорт ставок C7.1/C7.2 из Excel/CSV.
// Ожидаемые колонки (как на листе «Для расчетов»): тип | материал | положение | группа давления | группа диаметра | ед. | ставка | пункт
// Заголовки могут отличаться — распознаём по содержимому. Тип строки: C7.1 / C7.2.

import * as XLSX from 'xlsx';
import type { C7Entry } from './types';

export interface C7ImportResult {
  entries: C7Entry[];
  errors: string[];
  totalRows: number;
}

const TYPE_VALUES = ['C7.1', 'C7.2'];
const MATERIALS = ['сталь', 'полиэтилен'];
const LAYINGS = ['надземная', 'подземная', '-'];

export async function importC7File(file: File | ArrayBuffer): Promise<C7ImportResult> {
  const errors: string[] = [];
  let wb: XLSX.WorkBook;
  try {
    const buf = file instanceof File ? await file.arrayBuffer() : file;
    wb = XLSX.read(buf, { type: 'array' });
  } catch {
    return { entries: [], errors: ['Не удалось прочитать файл. Нужен файл Excel (.xlsx, .xls, .xlsm) или CSV.'], totalRows: 0 };
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { entries: [], errors: ['В файле нет листов.'], totalRows: 0 };
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1, raw: true, defval: null });
  if (!rows.length) return { entries: [], errors: ['Лист пустой.'], totalRows: 0 };

  // Найдём строку заголовка: в ней должна быть ячейка со значением C7.1 или C7.2 ИЛИ заголовки колонок.
  // Данные ищем по маркеру C7.x в первых 3 колонках любой строки.
  const entries: C7Entry[] = [];
  let totalRows = 0;

  for (const row of rows) {
    const cells = (row as (string | number | null)[]).map((c) =>
      c === null || c === undefined ? '' : String(c).trim());
    const typeIdx = cells.findIndex((c) => TYPE_VALUES.includes(c.toUpperCase() as string) || TYPE_VALUES.includes(c));
    if (typeIdx < 0) continue;
    totalRows++;
    const type = cells[typeIdx].toUpperCase() as 'C7.1' | 'C7.2';
    const material = cells[typeIdx + 1]?.toLowerCase() ?? '';
    const laying = cells[typeIdx + 2]?.toLowerCase() ?? '';
    const pressure = cells[typeIdx + 3] ?? '';
    const diam = cells[typeIdx + 4] ?? '';
    const rateRaw = cells[typeIdx + 6] ?? cells[typeIdx + 5] ?? '';
    const punkt = cells[typeIdx + 7] ?? cells[typeIdx + 6] ?? '';

    const rate = typeof rateRaw === 'number' ? rateRaw : parseFloat(String(rateRaw).replace(/\s/g, '').replace(',', '.'));
    const rowNum = totalRows;

    if (!MATERIALS.includes(material)) {
      errors.push(`Строка ${rowNum}: материал «${material}» должен быть «сталь» или «полиэтилен».`);
      continue;
    }
    if (!LAYINGS.includes(laying)) {
      errors.push(`Строка ${rowNum}: положение «${laying}» должно быть «надземная», «подземная» или «-».`);
      continue;
    }
    if (!pressure || !diam) {
      errors.push(`Строка ${rowNum}: не заданы группы давления/диаметра.`);
      continue;
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      errors.push(`Строка ${rowNum}: ставка «${rateRaw}» не является положительным числом.`);
      continue;
    }
    entries.push({ type, material, laying, pressure, diam, rate, punkt: String(punkt).trim() });
  }

  if (totalRows === 0) {
    errors.push('Не найдено ни одной строки со ставками: в одной из первых колонок должно быть значение «C7.1» или «C7.2».');
  }
  // Проверка полноты сетки: 2 типа × материалы × положения × группы
  const key = (e: C7Entry) => `${e.type}|${e.material}|${e.laying}|${e.pressure}|${e.diam}`;
  const seen = new Set(entries.map(key));
  void seen;
  return { entries, errors, totalRows };
}

// Проверка покрытия: все ли комбинации, используемые формулами, присутствуют
export function validateC7Coverage(entries: C7Entry[]): string[] {
  const warnings: string[] = [];
  const get = (t: string, m: string, l: string, p: string, d: string) =>
    entries.some((e) => e.type === t && e.material === m && e.laying === l && e.pressure === p && e.diam === d);
  const steelDiam = ['до 100 мм', '101-158 мм', '159-218 мм', '219-272 мм', '273-324 мм', '325-425 мм', '426-529 мм', '530 мм и выше'];
  const peDiam = ['109 мм и менее', '110-159 мм', '160-224 мм', '225-314 мм', '315-399 мм', '400 мм и выше'];
  for (const t of ['C7.1', 'C7.2']) {
    for (const p of ['до 0,005 МПа', '0,005-1,2 МПа']) {
      for (const l of ['надземная', 'подземная']) {
        for (const d of steelDiam) if (!get(t, 'сталь', l, p, d)) warnings.push(`${t} сталь ${l} ${p} ${d}`);
      }
    }
    for (const p of ['до 0,6 МПа', '0,6-1,2 МПа']) {
      for (const d of peDiam) if (!get(t, 'полиэтилен', '-', p, d)) warnings.push(`${t} полиэтилен ${p} ${d}`);
    }
  }
  return warnings;
}
