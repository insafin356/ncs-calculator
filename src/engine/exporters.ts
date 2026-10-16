// Экспорт результатов в Excel (аналог макроса «Вывод на печать» Excel-калькулятора).
// Лист «Итоги» заполняется в шаблоне с фирменным оформлением (exceljs сохраняет стили).

import ExcelJS from 'exceljs';
import type { CalcRowResult, Totals } from './types';
import type { Justification } from './justification';

const f2 = (v: number) => Math.round(v * 100) / 100;

const stamp = () => {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
};

async function downloadWb(wb: ExcelJS.Workbook, filename: string): Promise<void> {
  const bufOut = await wb.xlsx.writeBuffer();
  const blob = new Blob([bufOut as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- Лист «Обоснование расчета» в фирменных цветах Excel ----------

const CLR = {
  title: 'FF1F4E79',   // тёмно-синий заголовок
  sub: 'FFD9EAF7',     // подзаголовок
  head: 'FF5B9BD5',    // шапки разделов
  text: 'FFFFF2CC',    // текстовые врезки
  label: 'FFF2F2F2',   // подписи полей
  tblHead: 'FF4472C4', // шапки таблиц
  total: 'FFE2EFDA',   // строки ИТОГО
  ok: 'FFC6EFCE',      // статус совпадает
  okText: 'FF006100',
  fail: 'FFFFC7CE',
  failText: 'FF9C0006',
};

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
};

export function buildJustificationSheet(wb: ExcelJS.Workbook, just: Justification, name = 'Обоснование'): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(name);
  ws.columns = [
    { width: 6 }, { width: 38 }, { width: 30 }, { width: 26 }, { width: 16 },
    { width: 13 }, { width: 14 }, { width: 17 }, { width: 17 }, { width: 17 },
  ];
  const N = 10; // колонок A..J
  let r = 1;
  const mergeRow = (row: number) => ws.mergeCells(row, 1, row, N);
  const fillRow = (row: number, color: string) => {
    for (let c = 1; c <= N; c++) {
      ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    }
  };

  // Шапка
  mergeRow(r);
  const t = ws.getCell(r, 1);
  t.value = 'РАСШИФРОВКА УКРУПНЕННОГО РАСЧЕТА СТОИМОСТИ ТЕХНОЛОГИЧЕСКОГО ПРИСОЕДИНЕНИЯ';
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.title } };
  t.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  t.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  fillRow(r, CLR.title);
  ws.getRow(r).height = 30;
  r++;
  mergeRow(r);
  const st = ws.getCell(r, 1);
  st.value = 'Пояснительная информация к листу «Итоги»';
  st.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.sub } };
  st.font = { bold: true };
  st.alignment = { horizontal: 'center' };
  fillRow(r, CLR.sub);
  r++;

  // Реквизиты
  const rekv = (label: string, value: string) => {
    ws.mergeCells(r, 1, r, 2);
    const l = ws.getCell(r, 1);
    l.value = label;
    l.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.label } };
    l.font = { bold: true };
    l.border = thinBorder;
    ws.getCell(r, 2).border = thinBorder;
    ws.mergeCells(r, 3, r, N);
    ws.getCell(r, 3).value = value;
    ws.getCell(r, 3).border = thinBorder;
    r++;
  };
  rekv('Объект:', just.objectName);
  rekv('Дата формирования:', just.date);
  if (just.preparedBy) rekv('Расчет подготовил:', just.preparedBy);
  r++;

  const num = (v: unknown) => typeof v === 'number';

  for (const s of just.sections) {
    if (s.title) {
      mergeRow(r);
      const h = ws.getCell(r, 1);
      h.value = s.title;
      h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.head } };
      h.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      fillRow(r, CLR.head);
      r++;
    }
    if (s.kind === 'text' && s.text) {
      mergeRow(r);
      const c = ws.getCell(r, 1);
      c.value = s.text;
      c.alignment = { wrapText: true, vertical: 'top' };
      fillRow(r, CLR.text);
      ws.getRow(r).height = Math.max(18, Math.ceil(s.text.length / 105) * 14);
      r++;
      r++;
    }
    if (s.kind === 'kv') {
      for (const [k, v] of s.kv ?? []) {
        ws.mergeCells(r, 1, r, 2);
        const l = ws.getCell(r, 1);
        l.value = k;
        l.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.label } };
        l.font = { bold: true };
        l.border = thinBorder;
        ws.getCell(r, 2).border = thinBorder;
        ws.mergeCells(r, 3, r, N);
        ws.getCell(r, 3).value = v;
        ws.getCell(r, 3).border = thinBorder;
        r++;
      }
      r++;
    }
    if (s.kind === 'table') {
      const head = ws.getRow(r);
      (s.headers ?? []).forEach((h, i) => {
        const c = head.getCell(i + 1);
        c.value = h;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.tblHead } };
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.border = thinBorder;
        c.alignment = { wrapText: true, vertical: 'middle' };
      });
      r++;
      for (const row of s.rows ?? []) {
        const isTotal = String(row[1] ?? '').startsWith('ИТОГО');
        const rr = ws.getRow(r);
        row.forEach((v, i) => {
          const c = rr.getCell(i + 1);
          c.value = v as string | number;
          c.border = thinBorder;
          if (num(v)) c.numFmt = '#,##0.00';
          if (isTotal) {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.total } };
            c.font = { bold: true };
          }
        });
        r++;
      }
      r++;
    }
    if (s.kind === 'check') {
      const headers = ['Показатель', 'По таблице 6, тыс. руб.', 'По листу «Итоги», тыс. руб.', 'Отклонение, тыс. руб.'];
      const head = ws.getRow(r);
      headers.forEach((h, i) => {
        const c = head.getCell(i + 1);
        c.value = h;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.tblHead } };
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.border = thinBorder;
      });
      r++;
      for (const chk of s.checks ?? []) {
        const rr = ws.getRow(r);
        [chk.name, chk.calc, chk.summary, chk.calc - chk.summary].forEach((v, i) => {
          const c = rr.getCell(i + 1);
          c.value = v as string | number;
          c.border = thinBorder;
          if (i > 0) c.numFmt = '#,##0.00';
        });
        r++;
      }
      const ok = (s.status ?? 'ok') === 'ok';
      mergeRow(r);
      const c = ws.getCell(r, 1);
      c.value = ok ? 'Контроль итогов таблицы 6: СОВПАДАЕТ' : 'ВНИМАНИЕ: РАСХОЖДЕНИЕ ИТОГОВ';
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ok ? CLR.ok : CLR.fail } };
      c.font = { bold: true, color: { argb: ok ? CLR.okText : CLR.failText } };
      c.alignment = { horizontal: 'center' };
      fillRow(r, ok ? CLR.ok : CLR.fail);
      r++;
      r++;
    }
  }
  return ws;
}

export async function exportJustificationExcel(just: Justification): Promise<void> {
  const wb = new ExcelJS.Workbook();
  buildJustificationSheet(wb, just, 'Обоснование расчета');
  await downloadWb(wb, `Обоснование расчета_${stamp()}.xlsx`);
}

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

  // Лист «Обоснование» (в фирменных цветах)
  buildJustificationSheet(wb, just, 'Обоснование');

  const grp = withGRP ? 'с учетом' : 'без';
  await downloadWb(wb, `ИТОГИ ${grp} ГРПШ-ГРПБ_${stamp()}.xlsx`);
}
