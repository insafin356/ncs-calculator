// Построение «Обоснования расчета» — структурированный отчёт,
// эквивалент листа «Обоснование расчета» из Excel (макрос modFASJustification).

import type { CalcInput, CalcRowResult, Totals } from './types';

export interface JustSection {
  title: string;
  kind: 'text' | 'kv' | 'table' | 'check';
  text?: string;
  kv?: [string, string][];
  headers?: string[];
  rows?: (string | number)[][];
  checks?: { name: string; calc: number; summary: number }[];
  status?: 'ok' | 'fail';
  statusText?: string;
}

export interface Justification {
  objectName: string;
  date: string;
  preparedBy: string;
  mode: 'tp' | 'stroy';
  sections: JustSection[];
  totals: Totals;
}

const fmt = (v: number, d = 2) =>
  v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });

// Участки, входящие в протяженность (как techRows в макросе)
export function buildJustification(
  input: CalcInput,
  rows: CalcRowResult[],
  totals: Totals,
): Justification {
  const stroy = input.mode === 'stroy';
  const j: Justification = {
    objectName: input.objectName || 'Строительство наружного газопровода до границы земельного участка',
    date: new Date().toLocaleDateString('ru-RU'),
    preparedBy: input.preparedBy,
    mode: stroy ? 'stroy' : 'tp',
    totals,
    sections: [],
  };

  // Протяжённости
  let totalAbove = 0, totalOpen = 0, totalHDD = 0;
  const stDiams = new Set<number>(); const peDiams = new Set<number>();
  const sectRows: (string | number)[][] = [];
  let n = 0;
  const addLen = (key: string, label: string, material: string, laying: string, method: string) => {
    input[key as keyof CalcInput] as { len: number | null; diam: number | null }[];
    const arr = input[key as keyof CalcInput] as { len: number | null; diam: number | null }[];
    arr.forEach((s, i) => {
      if ((s.len ?? 0) > 0) {
        const len = s.len!, diam = s.diam ?? 0;
        if (laying === 'Надземная') totalAbove += len;
        if (laying === 'Подземная' && method === 'Открытый способ') totalOpen += len;
        if (method === 'ГНБ (ННБ)') totalHDD += len;
        (material === 'Сталь' ? stDiams : peDiams).add(diam);
        n++;
        sectRows.push([n, `${label}, участок ${i + 1}`, material, laying, method, fmt(diam, 0), fmt(len)]);
      }
    });
  };
  addLen('steelAbove', 'Монтаж надземного газопровода (сталь)', 'Сталь', 'Надземная', 'Надземная прокладка');
  addLen('steelOpen', 'Укладка СТ подземного газопровода', 'Сталь', 'Подземная', 'Открытый способ');
  addLen('steelHDD', 'Устройство ННБ (сталь)', 'Сталь', 'Подземная', 'ГНБ (ННБ)');
  addLen('tpOpen', 'Укладка ПЭ газопровода ТП', 'Полиэтилен (ТП)', 'Подземная', 'Открытый способ');
  addLen('tpHDD', 'ННБ ТП ПЭ', 'Полиэтилен (ТП)', 'Подземная', 'ГНБ (ННБ)');
  addLen('peOpen', 'Укладка ПЭ газопровода', 'Полиэтилен', 'Подземная', 'Открытый способ');
  addLen('peHDD', 'Устройство ННБ (ПЭ)', 'Полиэтилен', 'Подземная', 'ГНБ (ННБ)');
  const totalUnderground = totalOpen + totalHDD;
  const totalLength = totalAbove + totalUnderground;

  // Текст описания
  let desc = '';
  const p = input.point;
  if (p.material || p.laying || (p.diam ?? 0) > 0 || (p.pressure ?? 0) > 0) {
    desc += 'Точка подключения: ';
    if (p.material) desc += p.material.toLowerCase();
    if (p.laying) desc += `, ${p.laying.toLowerCase()} прокладка`;
    if ((p.diam ?? 0) > 0) desc += `, диаметр ${fmt(p.diam!)} мм`;
    if ((p.pressure ?? 0) > 0) desc += `, давление ${fmt(p.pressure!, 3)} МПа`;
    desc += '. ';
  }
  if (totalLength > 0) {
    desc += `Общая протяженность проектируемых газопроводов составляет ${fmt(totalLength)} м, в том числе`;
    if (totalAbove > 0) desc += ` надземная часть — ${fmt(totalAbove)} м`;
    if (totalAbove > 0 && totalUnderground > 0) desc += ';';
    if (totalUnderground > 0) desc += ` подземная часть — ${fmt(totalUnderground)} м`;
    desc += '. ';
  }
  if (totalOpen > 0) desc += `Открытым способом предусматривается прокладка ${fmt(totalOpen)} м подземного газопровода. `;
  if (totalHDD > 0) desc += `Методом ГНБ (ННБ) предусматривается устройство участков общей протяженностью ${fmt(totalHDD)} м. `;
  if (stDiams.size) desc += `Диаметры стальных газопроводов: ${[...stDiams].sort((a, b) => a - b).map((d) => fmt(d, 0)).join(', ')} мм. `;
  if (peDiams.size) desc += `Диаметры полиэтиленовых газопроводов: ${[...peDiams].sort((a, b) => a - b).map((d) => fmt(d, 0)).join(', ')} мм. `;
  if ((input.grpsh ?? 0) > 0) desc += `Предусмотрена установка ГРПШ — ${fmt(input.grpsh!, 0)} шт. `;
  if ((input.grpb ?? 0) > 0) desc += `Предусмотрена установка ГРПБ — ${fmt(input.grpb!, 0)} шт. `;
  if ((input.ehzLen ?? 0) > 0) desc += 'Предусмотрено устройство электрохимической защиты. ';
  const forest = input.areaType === 'Лесной фонд';
  if ((input.treesArea ?? 0) > 0) {
    desc += 'Лесоустроительные/озеленительные работы предусмотрены: ' +
      `валка деревьев — ${fmt(input.treesArea!)} кв. м; компенсационное озеленение — ${fmt(input.treesArea!)} кв. м`;
    if (!forest) desc += `; трехлетний уход — ${fmt(input.treesArea!)} кв. м`;
    desc += '.';
  } else {
    desc += 'Лесоустроительные и компенсационные работы исходными данными не предусмотрены.';
  }

  j.sections.push({
    title: '1. НАЗНАЧЕНИЕ РАСЧЕТА',
    kind: 'text',
    text: stroy
      ? 'Настоящая расшифровка подготовлена в пояснение к укрупненному расчету стоимости строительства газопровода по объекту. Документ содержит сведения о принятых технических решениях, физических объемах, составе работ и структуре стоимости. Налог на прибыль и ставки C7.1 / C7.2 в данном виде расчета не учитываются. Строки с нулевыми объемами в подробной расшифровке не выводятся.'
      : 'Настоящая расшифровка подготовлена в пояснение к укрупненному расчету стоимости мероприятий по технологическому присоединению. Документ содержит сведения о принятых технических решениях, физических объемах, составе работ и структуре стоимости. Строки с нулевыми объемами в подробной расшифровке не выводятся.',
  });
  j.sections.push({ title: '2. ОСНОВНЫЕ ТЕХНИЧЕСКИЕ РЕШЕНИЯ', kind: 'text', text: desc });

  if (!stroy) {
    j.sections.push({
      title: '3. ИНФОРМАЦИЯ ПО ТОЧКЕ ПОДКЛЮЧЕНИЯ',
      kind: 'kv',
      kv: [
        ['Материал газопровода', p.material || 'не задано'],
        ['Способ прокладки', p.laying || (p.material === 'Полиэтилен' ? 'не учитывается' : 'не задано')],
        ['Давление в газопроводе-источнике', (p.pressure ?? 0) > 0 ? `${fmt(p.pressure!, 3)} МПа` : 'не задано'],
        ['Диаметр газопровода', (p.diam ?? 0) > 0 ? `${fmt(p.diam!, 0)} мм` : 'не задано'],
        ['Тарифная группа давления', totals.pressureGroup || 'не определена'],
        ['Тарифная группа диаметра', totals.diamGroup || 'не определена'],
        ['Ставка C7.1 — мониторинг выполнения ТУ', totals.c71Rate !== null ? `${fmt(totals.c71Rate)} руб. / п. ${totals.c71Punkt}` : 'не определена'],
        ['Ставка C7.2 — фактическое подключение', totals.c72Rate !== null ? `${fmt(totals.c72Rate)} руб. / п. ${totals.c72Punkt}` : 'не определена'],
      ],
    });
  }

  j.sections.push({
    title: '4. СОСТАВ ПРОЕКТИРУЕМОГО ГАЗОПРОВОДА',
    kind: 'table',
    headers: ['№', 'Участок', 'Материал', 'Положение', 'Способ прокладки', 'Диаметр, мм', 'Протяженность, м'],
    rows: sectRows.length ? sectRows : [['', 'Участки газопровода с ненулевой протяженностью не заданы', '', '', '', '', '']],
  });
  j.sections.push({
    title: '', kind: 'kv',
    kv: [
      ['Общая протяженность газопровода', `${fmt(totalLength)} м`],
      ['Надземная часть', `${fmt(totalAbove)} м`],
      ['Подземная часть — всего', `${fmt(totalUnderground)} м`],
      ['в том числе открытым способом', `${fmt(totalOpen)} м`],
      ['в том числе ГНБ (ННБ)', `${fmt(totalHDD)} м`],
    ],
  });

  const extraRows: (string | number)[][] = [];
  let m = 0;
  const ex = (name: string, qty: string, note = '') => { m++; extraRows.push([m, name, qty, note]); };
  if ((input.grpsh ?? 0) > 0) ex('Монтаж ГРПШ', `${fmt(input.grpsh!, 0)} шт.`);
  if ((input.grpb ?? 0) > 0) ex('Монтаж ГРПБ', `${fmt(input.grpb!, 0)} шт.`);
  if ((input.ehzLen ?? 0) > 0) ex('Электрохимическая защита', 'предусмотрено', 'расчет по вкладке «ЭХЗ»');
  if ((input.treesArea ?? 0) > 0) {
    ex('Валка деревьев', `${fmt(input.treesArea!)} кв. м`);
    ex('Компенсационное озеленение', `${fmt(input.treesArea!)} кв. м`);
    if (!forest) ex('Трехлетний уход', `${fmt(input.treesArea!)} кв. м`);
  }
  const wireRow = rows.find((r) => r.key === 'wire');
  if (wireRow) ex('Провод-спутник', `${fmt(wireRow.volume)} м`);
  const casingLen = input.casing.reduce((a, s) => a + (s.len ?? 0), 0);
  if (casingLen > 0) ex('Стальные футляры', `${fmt(casingLen)} м`);
  j.sections.push({
    title: '5. ДОПОЛНИТЕЛЬНЫЕ СООРУЖЕНИЯ И РАБОТЫ',
    kind: 'table',
    headers: ['№', 'Наименование', 'Количество / объем', 'Примечание'],
    rows: extraRows.length ? extraRows : [['', 'Дополнительные сооружения и работы по введенным исходным данным отсутствуют', '', '']],
  });

  // Таблица 6 — детализация стоимости (без НДС)
  const dRows = rows
    .filter((r) => Math.abs(r.smr) > 1e-7 || Math.abs(r.pir) > 1e-7)
    .map((r, i) => [
      i + 1, r.label, r.source, r.unit || '', r.volume ? fmt(r.volume) : '',
      r.diam ? fmt(r.diam, 0) : '', fmt(r.smr / 1.22), fmt(r.pir / 1.22), fmt((r.smr + r.pir) / 1.22),
    ]);
  const sumSMR = rows.reduce((a, r) => a + r.smr / 1.22, 0);
  const sumPIR = rows.reduce((a, r) => a + r.pir / 1.22, 0);
  dRows.push(['', 'ИТОГО ПО БАЗОВЫМ ЗАТРАТАМ ТАБЛИЦЫ 6', '', '', '', '', fmt(sumSMR), fmt(sumPIR), fmt(sumSMR + sumPIR)]);
  j.sections.push({
    title: '6. ПОДРОБНАЯ РАСШИФРОВКА СТОИМОСТИ',
    kind: 'table',
    headers: ['№', 'Наименование работ / затрат', 'Источник', 'Ед.', 'Объем', 'Диаметр, мм', 'СМР без НДС, тыс. руб.', 'ПИР без НДС, тыс. руб.', 'Сумма, тыс. руб.'],
    rows: dRows,
  });

  // Контрольные сверки
  const checks = [
    { name: 'СМР — контроль с Итогами!F16', calc: sumSMR, summary: totals.smr },
    { name: 'ПИР — контроль с Итогами!F20', calc: sumPIR, summary: totals.pir },
  ];
  const diff = Math.abs(sumSMR - totals.smr) < 0.01 && Math.abs(sumPIR - totals.pir) < 0.01;
  j.sections.push({ title: 'КОНТРОЛЬ ИТОГОВ ТАБЛИЦЫ 6', kind: 'check', checks, status: diff ? 'ok' : 'fail' });

  const itogKv: [string, string][] = [
    ['СМР без НДС', fmt(totals.smr)],
    ['ПИР без НДС', fmt(totals.pir)],
    ['Авторский надзор', fmt(totals.author)],
    ['Итого по главам 1–12 (без НДС)', fmt(totals.base)],
  ];
  if (!stroy) itogKv.push(['Налог на прибыль', fmt(totals.profit)]);
  itogKv.push(['НДС по основному расчету', fmt(totals.vat)]);
  itogKv.push(['Итого по сводному расчету', fmt(totals.mainTotal)]);
  if (!stroy) {
    itogKv.push(
      ['Ставка C7.1', fmt(totals.c71)],
      ['Ставка C7.2', fmt(totals.c72)],
      ['Итого C7.1 + C7.2 без НДС', fmt(totals.c7Total)],
      ['НДС по C7.1 + C7.2', fmt(totals.c7Vat)],
      ['Итого C7.1 + C7.2 с НДС', fmt(totals.c7WithVat)],
      ['ВСЕГО ПО РАСЧЕТУ', fmt(totals.grand)],
    );
  } else {
    itogKv.push(['ВСЕГО ПО РАСЧЕТУ', fmt(totals.grand)]);
  }
  j.sections.push({
    title: '7. ИТОГОВЫЕ ЗНАЧЕНИЯ (лист «Итоги»)',
    kind: 'kv',
    kv: itogKv,
  });

  const grandCheck = Math.abs(totals.grand - (totals.mainTotal + totals.c7WithVat)) < 0.01;
  j.sections.push({
    title: '8. ПОЯСНЕНИЯ К РАСЧЕТУ',
    kind: 'text',
    text: (stroy
      ? `Контроль: расхождение с укрупненным расчетом — ${fmt(Math.abs(totals.grand - totals.mainTotal))} тыс. руб. (${Math.abs(totals.grand - totals.mainTotal) < 0.01 ? 'совпадает' : 'расхождение!'}).\n` +
        'Режим расчета «строительство»: налог на прибыль и ставки C7.1 / C7.2 (мониторинг выполнения ТУ, фактическое подключение) не учитываются.\n'
      : `Контроль: расхождение с укрупненным расчетом — ${fmt(Math.abs(totals.grand - totals.mainTotal - totals.c7WithVat))} тыс. руб. (${grandCheck ? 'совпадает' : 'расхождение!'}).\n`) +
      '1) Подробная расшифровка включает все позиции, формирующие итог СМР и ПИР.\n' +
      '2) Итог СМР сравнивается с Итогами!F16, итог ПИР — с Итогами!F20.\n' +
      '3) Общая протяженность определяется только по физическим участкам прокладки и не включает длину футляров, протаскивание и стоимость труб.',
  });

  return j;
}
