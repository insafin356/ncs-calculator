export const fmt = (v: number, d = 2): string =>
  v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtInt = (v: number): string =>
  v.toLocaleString('ru-RU', { maximumFractionDigits: 0 });

export const fmtMoney = (v: number): string => `${fmt(v)} ₽`;

// парсинг ввода: допускаем запятую/точку, пробелы
export function parseNum(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}
