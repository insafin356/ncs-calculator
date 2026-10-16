// Типы данных калькулятора (зеркало структуры Excel-файла)

export interface NcsEntry {
  row: number;        // исходная строка листа «НЦС 15»
  code: string;       // код НЦС, напр. 15-01-005-02
  total: number;      // стоимость строительства всего, тыс. руб.
  pir: number;        // в т.ч. ПИР, тыс. руб.
  control: number;    // стройконтроль, тыс. руб.
}

export interface Spr1Row {
  row: number;
  diam: number;
  price: number;      // руб/м с НДС
  src: 'ncs' | 'ncs_sdr' | 'ncs10' | 'static';
  ncsRow?: number;
  sdrIdx?: number;
  ncsCode?: string | null;
}

export interface PirMatrix {
  matrix: { len: number; vals: (number | null)[] }[]; // C=длина, D..G значения
  diamCol: Record<string, number>;                    // диаметр -> индекс колонки 2..5 (VLOOKUP I:J)
}

export interface Spr3Data {
  len1: number[];            // C4:C9 — длины для блоков СМР ГНБ
  hdr1: string[];            // D3:R3 — «Стоимость выполнения ГНБ Ду 50, ...»
  val1: (number | null)[][]; // D4:R9
  pir: { len: number; vals: (number | null)[] }[];     // B14:B116 + C14:E116
  hdr3: string[];            // S3:AA3
  val3: (number | null)[][]; // S4:AA9
}

export interface PriceRow { diam: number; price: number }
export interface Spr6Row { diam: number; name: string | null; price: number }

export interface C7Entry {
  type: 'C7.1' | 'C7.2';
  material: string;   // сталь | полиэтилен
  laying: string;     // надземная | подземная | -
  pressure: string;   // группа давления
  diam: string;       // группа диаметра
  rate: number;       // ставка, руб.
  punkt: string;      // пункт тарифного решения
}

export interface ReferenceData {
  ncs15: NcsEntry[];
  spr1: Spr1Row[];
  spr2st: PirMatrix;
  spr2pe: PirMatrix;
  spr3: Spr3Data;
  spr4: { wirePrice: number; grpF16: number; grpG16: number };
  spr5: { b1: PriceRow[]; b2: PriceRow[]; b3: PriceRow[]; b4: PriceRow[] };
  spr6: { b1: Spr6Row[]; b2: Spr6Row[] };
  spr7: { valka: number; komp: number; uhod: number };
  c7: C7Entry[];
  sdr: number[];
}

// ---------- Ввод пользователя ----------

export interface Section { len: number | null; diam: number | null }

export interface CalcInput {
  objectName: string;
  // сталь надземная (3 участка)
  steelAbove: Section[];
  // сталь подземная открытая (3)
  steelOpen: Section[];
  // стальные футляры (3)
  casing: Section[];
  // сталь ГНБ (3)
  steelHDD: Section[];
  // протаскивание СТ в футляр (3)
  pullST: Section[];
  // стоимость СТ труб (3)
  pipesST: Section[];
  // ПЭ ТП открытая (3)
  tpOpen: Section[];
  // ПЭ ТП ГНБ (3)
  tpHDD: Section[];
  // ПЭ открытая (3)
  peOpen: Section[];
  // ПЭ ГНБ (3)
  peHDD: Section[];
  // протаскивание ПЭ в футляр (3)
  pullPE: Section[];
  // стоимость ПЭ труб (3)
  pipesPE: Section[];
  grpb: number | null;   // монтаж ГРПБ, шт
  grpsh: number | null;  // монтаж ГРПШ, шт
  ehzLen: number | null; // ЭХЗ, м (условная длина, как E92)
  treesArea: number | null;    // валка, м2
  areaType: 'Лесной фонд' | 'Лесопарковые зоны населенных пунктов';
  // точка подключения
  point: {
    material: '' | 'Сталь' | 'Полиэтилен';
    laying: '' | 'Надземная' | 'Подземная';
    pressure: number | null; // МПа
    diam: number | null;     // мм
  };
  preparedBy: string; // «Расчет подготовил»
}

export interface EhzInput {
  protectedLen: number | null; // авто: сумма подземного стального
  sections: number | null;     // E6
  skz: number | null;          // E7
  azType: 'Глубинное' | 'Поверхностное' | 'Групповое';
  azCount: number | null;      // E9
  anodesPerAz: number | null;  // E10
  cableAz: number | null;      // E11
  cablePipe: number | null;    // E12
  kip: number | null;          // E13
  eis: number | null;          // E14
  pnr: number | null;          // E15
  pirCoeff: number | null;     // E16
  actualCoeff: number | null;  // E17
  other: number | null;        // E18
  prices: number[];            // E22..E32 базовые цены (11 позиций)
}

// ---------- Результаты ----------

export interface CalcRowResult {
  key: string;
  label: string;
  source: string;
  unit: string;
  volume: number;   // объём
  diam: number;     // диаметр, мм
  smr: number;      // СМР с НДС, тыс. руб.
  pir: number;      // ПИР с НДС, тыс. руб.
  total: number;    // smr + pir
  error?: string;   // сообщение об ошибке подбора (аналог #Н/Д)
}

export interface Totals {
  smrWithVat: number;   // Расчет!G3
  pirWithVat: number;   // Расчет!H3
  totalWithVat: number; // F3
  smr: number;          // Итоги!F16 = G3/1.22
  pir: number;          // Итоги!F20 = H3/1.22
  author: number;       // F21 = F20*0.002
  base: number;         // F23 = F18+F22
  profit: number;       // F25
  vat: number;          // F26
  mainTotal: number;    // F28
  c71: number;          // F30, тыс. руб.
  c72: number;          // F31
  c7Total: number;      // F32
  c7Vat: number;        // F33
  c7WithVat: number;    // F34
  grand: number;        // F35
  c71Rate: number | null;  // руб.
  c72Rate: number | null;
  c71Punkt: string;
  c72Punkt: string;
  pressureGroup: string;
  diamGroup: string;
}
