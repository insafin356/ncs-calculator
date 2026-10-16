// Парсер XML НЦС из КонсультантПлюс (WordML) — порт макроса Module1.bas
// «Обновить_НЦС15_Из_XML». Извлекает по коду НЦС три показателя:
// стоимость строительства всего, ПИР, стройконтроль.

const NS_W = 'http://schemas.microsoft.com/office/word/2003/wordml';

function normalizeSpaces(s: string): string {
  return s.replace(/[\u00A0\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// NormalizeNCSCode: заменяем типы тире, убираем пробелы, ищем 15-XX-XXX-XX
export function normalizeNCSCode(txt: string): string {
  let t = txt
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, '-')
    .replace(/[\u00A0 ]/g, '');
  const m = t.match(/15-\d{2}-\d{3}-\d{2}/i);
  return m ? m[0].toUpperCase() : '';
}

function tryParseAmount(txt: string): number | null {
  const t = normalizeSpaces(txt);
  if (!t) return null;
  if (!/^(?:\d{1,3}(?: \d{3})*|\d+)[,.]\d{2}$/.test(t)) return null;
  return parseFloat(t.replace(/[\u00A0 ]/g, '').replace(',', '.'));
}

function cellText(tc: Element): string {
  const texts = Array.from(tc.getElementsByTagNameNS(NS_W, 't'));
  return normalizeSpaces(texts.map((t) => t.textContent ?? '').join(''));
}

export interface NcsXmlResult {
  values: Map<string, [number, number, number]>; // код -> [строительство, ПИР, стройконтроль]
  parseError?: string;
}

export function parseNcsXml(xmlText: string, targetCodes: Set<string>): NcsXmlResult {
  const values = new Map<string, [number, number, number]>();
  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlText, 'text/xml');
    const err = doc.querySelector('parsererror');
    if (err) return { values, parseError: 'XML не распознан: ' + err.textContent?.slice(0, 200) };
  } catch (e) {
    return { values, parseError: 'Не удалось прочитать файл: ' + String(e) };
  }

  const rows = doc.getElementsByTagNameNS(NS_W, 'tr');
  for (const tr of Array.from(rows)) {
    const cells = Array.from(tr.childNodes).filter(
      (n): n is Element => n.nodeType === 1 && (n as Element).namespaceURI === NS_W && (n as Element).localName === 'tc',
    );
    if (cells.length < 4) continue;

    let codeIdx = -1;
    let code = '';
    for (let i = 0; i < cells.length; i++) {
      const c = normalizeNCSCode(cellText(cells[i]));
      if (c && targetCodes.has(c)) { code = c; codeIdx = i; break; }
    }
    if (codeIdx < 0 || values.has(code)) continue;

    // Три первые суммы после ячейки с кодом
    let amountCount = 0;
    let total = 0, pir = 0, control = 0;
    for (let i = codeIdx + 1; i < cells.length && amountCount < 3; i++) {
      const v = tryParseAmount(cellText(cells[i]));
      if (v !== null) {
        amountCount++;
        if (amountCount === 1) total = v;
        else if (amountCount === 2) pir = v;
        else control = v;
      }
    }
    if (amountCount >= 3 && total > 0) values.set(code, [total, pir, control]);
  }
  return { values };
}

// ---------- Пересчёт справочника 1 СМР из показателей НЦС ----------

// Правила (проверены на кешированных значениях книги, 0 расхождений):
//   строки 4..11  -> НЦС строка r+2:  (total - pir)/1000*1.22
//   строки 14..24 -> НЦС строка r:    (total - pir)/1000*1.22
//   строки 25..29 -> статика (расчетный аналог СТ)
//   строки 33..42 -> НЦС строка r-8:  (total - pir)/1000*1.22*sdr[r-33]
//   строка  43    -> статика (расчетный аналог ПЭ)
//   строки 47..58 -> НЦС строка r-9:  total/10*1.22
export function recalcSpr1(
  spr1: { row: number; price: number }[],
  ncsByRow: Map<number, { total: number; pir: number }>,
  sdr: number[],
): Map<number, number> {
  const out = new Map<number, number>();
  for (const r of spr1) {
    let price = r.price;
    if (r.row >= 4 && r.row <= 11) {
      const n = ncsByRow.get(r.row + 2);
      if (n) price = (n.total - n.pir) / 1000 * 1.22;
    } else if (r.row >= 14 && r.row <= 24) {
      const n = ncsByRow.get(r.row);
      if (n) price = (n.total - n.pir) / 1000 * 1.22;
    } else if (r.row >= 33 && r.row <= 42) {
      const n = ncsByRow.get(r.row - 8);
      if (n) price = (n.total - n.pir) / 1000 * 1.22 * sdr[r.row - 33];
    } else if (r.row >= 47 && r.row <= 58) {
      const n = ncsByRow.get(r.row - 9);
      if (n) price = n.total / 10 * 1.22;
    }
    out.set(r.row, price);
  }
  return out;
}
