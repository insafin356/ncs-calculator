// Экспорт результатов в Excel (аналог макроса «Вывод на печать» Excel-калькулятора).
// Лист «Итоги» заполняется в шаблоне с фирменным оформлением (exceljs сохраняет стили).

import ExcelJS from 'exceljs';
import type { CalcRowResult, Totals } from './types';
import type { Justification } from './justification';

const f2 = (v: number) => Math.round(v * 100) / 100;

async function loadTemplate(): Promise<ExcelJS.Workbook> {
  const res = await fetch(`${import.meta.env.BASE_URL}templates/itogi-template.xlsx`);
  if (!res.ok) throw new Error(`Шаблон не найден: ${res.status}`);
  const buf = await res.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
  return wb;
}

export async function exportToExcel(
  rows: CalcRowResult[],
  totals: Totals,
  just: Justification,
  withGRP: boolean,
): Promise<void> {
  const wb = await loadTemplate();
  const ws = wb.getWorksheet('Итоги') ?? wb.worksheets[0];

  // Разбивка налогов по колонкам, как в Excel:
  // колонка D — доля СМР, колонка E — доля ПИР+авторский надзор.
  const D25 = f2((totals.smr * 25) / 75);
  const E25 = f2(((totals.pir + totals.author) * 25) / 75);
  const D26 = f2((totals.smr + D25) * 0.22);
  const E26 = f2((totals.pir + totals.author + E25) * 0.22);
  const F25 = D25 + E25;
  const F26 = totals.vat;
  const D27 = D25 + D26;
  const E27 = E25 + E26;
  const F27 = F25 + F26;

  ws.getCell('A9').value = `"${just.objectName}"`;

  const smrChapter = totals.smr;           // D16..F18
  const pirAll = totals.pir + totals.author; // E22
  for (const addr of ['D16', 'F16', 'D17', 'F17', 'D18', 'F18']) ws.getCell(addr).value = smrChapter;
  ws.getCell('E20').value = totals.pir;
  ws.getCell('F20').value = totals.pir;
  ws.getCell('E21').value = totals.author;
  ws.getCell('F21').value = totals.author;
  ws.getCell('E22').value = pirAll;
  ws.getCell('F22').value = pirAll;
  ws.getCell('D23').value = totals.smr;
  ws.getCell('E23').value = pirAll;
  ws.getCell('F23').value = totals.base;
  ws.getCell('D25').value = D25;
  ws.getCell('E25').value = E25;
  ws.getCell('F25').value = F25;
  ws.getCell('D26').value = D26;
  ws.getCell('E26').value = E26;
  ws.getCell('F26').value = F26;
  ws.getCell('D27').value = D27;
  ws.getCell('E27').value = E27;
  ws.getCell('F27').value = F27;
  ws.getCell('D28').value = totals.smr + D27;
  ws.getCell('E28').value = pirAll + E27;
  ws.getCell('F28').value = totals.base + F27;

  ws.getCell('F30').value = totals.c71;
  ws.getCell('G30').value = totals.c71Punkt ? `п. ${totals.c71Punkt}.` : '';
  ws.getCell('F31').value = totals.c72;
  ws.getCell('G31').value = totals.c72Punkt ? `п. ${totals.c72Punkt}.` : '';
  ws.getCell('F32').value = totals.c7Total;
  ws.getCell('F33').value = totals.c7Vat;
  ws.getCell('F34').value = totals.c7WithVat;
  ws.getCell('F35').value = totals.grand;

  // Лист «Расчет» (детализация)
  const ws2 = wb.addWorksheet('Расчет');
  ws2.addRow(['№', 'Наименование', 'Источник', 'Ед.', 'Объем', 'Диаметр', 'СМР с НДС, тыс. руб.', 'ПИР с НДС, тыс. руб.', 'Сумма, тыс. руб.']);
  rows.forEach((r, i) =>
    ws2.addRow([i + 1, r.label, r.source, r.unit, r.volume || '', r.diam || '', f2(r.smr), f2(r.pir), f2(r.total)]),
  );
  ws2.addRow(['', 'ИТОГО', '', '', '', '', f2(totals.smrWithVat), f2(totals.pirWithVat), f2(totals.totalWithVat)]);
  ws2.columns = [
    { width: 5 }, { width: 55 }, { width: 18 }, { width: 6 }, { width: 10 },
    { width: 8 }, { width: 20 }, { width: 20 }, { width: 18 },
  ];
  ws2.getRow(1).font = { bold: true };

  // Лист «Обоснование»
  const ws3 = wb.addWorksheet('Обоснование');
  ws3.addRow([just.objectName]);
  ws3.addRow([`Дата: ${just.date}`]);
  ws3.addRow([]);
  for (const s of just.sections) {
    if (s.title) ws3.addRow([s.title]);
    if (s.kind === 'text' && s.text) { ws3.addRow([s.text]); ws3.addRow([]); }
    if (s.kind === 'kv') { for (const [k, v] of s.kv ?? []) ws3.addRow([k, v]); ws3.addRow([]); }
    if (s.kind === 'table') {
      if (s.headers) ws3.addRow(s.headers);
      for (const r of s.rows ?? []) ws3.addRow(r);
      ws3.addRow([]);
    }
    if (s.kind === 'check') {
      ws3.addRow(['Показатель', 'По таблице 6', 'По листу «Итоги»', 'Отклонение']);
      for (const c of s.checks ?? []) ws3.addRow([c.name, f2(c.calc), f2(c.summary), f2(c.calc - c.summary)]);
      ws3.addRow([]);
    }
  }
  ws3.columns = [{ width: 50 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 15 }, { width: 12 }, { width: 22 }, { width: 22 }, { width: 18 }];

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const grp = withGRP ? 'с учетом' : 'без';
  const bufOut = await wb.xlsx.writeBuffer();
  const blob = new Blob([bufOut as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ИТОГИ ${grp} ГРПШ-ГРПБ_${stamp}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}
