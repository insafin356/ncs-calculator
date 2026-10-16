// Экспорт результатов в Excel (аналог макроса «Вывод на печать»)

import * as XLSX from 'xlsx';
import type { CalcRowResult, Totals } from './types';
import type { Justification } from './justification';

const f2 = (v: number) => Math.round(v * 100) / 100;

export function exportToExcel(
  rows: CalcRowResult[],
  totals: Totals,
  just: Justification,
  withGRP: boolean,
): void {
  const wb = XLSX.utils.book_new();

  // Лист «Итоги»
  const itog: (string | number)[][] = [
    ['Укрупненный расчет стоимости технологического присоединения'],
    ['Объект:', just.objectName],
    ['Дата:', just.date],
    just.preparedBy ? ['Расчет подготовил:', just.preparedBy] : [],
    [],
    ['Показатель', 'Сумма, тыс. руб.'],
    ['СМР без НДС', f2(totals.smr)],
    ['ПИР без НДС', f2(totals.pir)],
    ['Авторский надзор', f2(totals.author)],
    ['Итого по главам 1–12', f2(totals.base)],
    ['Налог на прибыль', f2(totals.profit)],
    ['НДС по основному расчету', f2(totals.vat)],
    ['Итого по сводному расчету', f2(totals.mainTotal)],
    ['Ставка C7.1 — мониторинг выполнения ТУ', f2(totals.c71)],
    ['Ставка C7.2 — фактическое подключение', f2(totals.c72)],
    ['Итого C7.1 + C7.2 без НДС', f2(totals.c7Total)],
    ['НДС по C7.1 + C7.2', f2(totals.c7Vat)],
    ['Итого C7.1 + C7.2 с НДС', f2(totals.c7WithVat)],
    ['ВСЕГО ПО РАСЧЕТУ', f2(totals.grand)],
  ].filter((r) => r.length);
  const ws1 = XLSX.utils.aoa_to_sheet(itog);
  ws1['!cols'] = [{ wch: 45 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Итоги');

  // Лист «Расчет» (детализация)
  const det: (string | number)[][] = [
    ['№', 'Наименование', 'Источник', 'Ед.', 'Объем', 'Диаметр', 'СМР с НДС, тыс. руб.', 'ПИР с НДС, тыс. руб.', 'Сумма, тыс. руб.'],
    ...rows.map((r, i) => [i + 1, r.label, r.source, r.unit, r.volume || '', r.diam || '', f2(r.smr), f2(r.pir), f2(r.total)]),
    ['', 'ИТОГО', '', '', '', '', f2(totals.smrWithVat), f2(totals.pirWithVat), f2(totals.totalWithVat)],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(det);
  ws2['!cols'] = [{ wch: 5 }, { wch: 55 }, { wch: 18 }, { wch: 6 }, { wch: 10 }, { wch: 8 }, { wch: 20 }, { wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Расчет');

  // Лист «Обоснование»
  const jus: (string | number)[][] = [[just.objectName], [`Дата: ${just.date}`], []];
  for (const s of just.sections) {
    if (s.title) jus.push([s.title]);
    if (s.kind === 'text' && s.text) jus.push([s.text], []);
    if (s.kind === 'kv') { for (const [k, v] of s.kv ?? []) jus.push([k, v]); jus.push([]); }
    if (s.kind === 'table') {
      if (s.headers) jus.push(s.headers);
      for (const r of s.rows ?? []) jus.push(r);
      jus.push([]);
    }
    if (s.kind === 'check') {
      jus.push(['Показатель', 'По таблице 6', 'По листу «Итоги»', 'Отклонение']);
      for (const c of s.checks ?? []) jus.push([c.name, f2(c.calc), f2(c.summary), f2(c.calc - c.summary)]);
      jus.push([]);
    }
  }
  const ws3 = XLSX.utils.aoa_to_sheet(jus);
  ws3['!cols'] = [{ wch: 50 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Обоснование');

  const stamp = new Date().toISOString().slice(0, 10);
  const grp = withGRP ? 'с ГРПШ-ГРПБ' : 'без ГРПШ-ГРПБ';
  XLSX.writeFile(wb, `Расчет ${grp} ${stamp}.xlsx`);
}
