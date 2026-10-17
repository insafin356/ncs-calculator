import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useApp } from '@/store/AppState';
import { exportToExcel } from '@/engine/exporters';
import { buildJustification } from '@/engine/justification';
import { computeRows, computeTotals } from '@/engine/engine';
import { fmt } from '@/lib/format';
import { useState } from 'react';

function Row({ label, value, bold, accent }: { label: string; value: number; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${bold ? 'font-semibold' : ''}`}>
      <span className={accent ? 'text-base' : 'text-sm'}>{label}</span>
      <span className={accent ? 'text-lg font-bold text-primary' : ''}>{fmt(value)}</span>
    </div>
  );
}

export default function TotalsPage() {
  const { input, rows, totals, ref, saveToHistory } = useApp();
  const [histName, setHistName] = useState('');
  const stroy = input.mode === 'stroy';

  const just = buildJustification(input, rows, totals);

  const exportVariant = (withGRP: boolean) => {
    const inp = withGRP ? input : { ...input, grpb: null, grpsh: null };
    const rr = computeRows(ref, inp);
    const tt = computeTotals(ref, inp, rr);
    exportToExcel(rr, tt, buildJustification(inp, rr, tt), withGRP);
  };

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {stroy
              ? 'Укрупненный расчет стоимости строительства газопровода по объекту'
              : 'Укрупненный расчет стоимости технологического присоединения'}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{just.objectName}</p>
        </CardHeader>
        <CardContent className="divide-y">
          <Row label="СМР без НДС, тыс. руб." value={totals.smr} />
          <Row label="ПИР без НДС, тыс. руб." value={totals.pir} />
          <Row label="Авторский надзор (0,2 % от ПИР)" value={totals.author} />
          <Row label="Итого по главам 1–12" value={totals.base} bold />
          {!stroy && <Row label="Налог на прибыль" value={totals.profit} />}
          <Row label="НДС 22 %" value={totals.vat} />
          <Row label="Итого по сводному расчету" value={totals.mainTotal} bold />
        </CardContent>
      </Card>

      {!stroy && (totals.c71Rate !== null || totals.c72Rate !== null || input.point.material) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ставки C7.1 / C7.2</CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            <Row label={`C7.1 — мониторинг выполнения ТУ (п. ${totals.c71Punkt || '—'})`} value={totals.c71} />
            <Row label={`C7.2 — фактическое подключение (п. ${totals.c72Punkt || '—'})`} value={totals.c72} />
            <Row label="Итого C7.1 + C7.2 без НДС" value={totals.c7Total} bold />
            <Row label="НДС 22 %" value={totals.c7Vat} />
            <Row label="Итого C7.1 + C7.2 с НДС" value={totals.c7WithVat} bold />
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold">ВСЕГО ПО РАСЧЕТУ</span>
            <span className="text-2xl font-bold text-primary">{fmt(totals.grand)} тыс. ₽</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Экспорт</CardTitle>
          {stroy && (
            <p className="text-xs text-muted-foreground">
              Уменьшенный вид: без налога на прибыль и без блока C7.1 / C7.2.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <Button className="w-full" onClick={() => void exportVariant(true)}>
            {stroy ? 'Excel (уменьшенный вид) — с ГРПШ/ГРПБ' : 'Excel — с ГРПШ/ГРПБ'}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => void exportVariant(false)}>
            {stroy ? 'Excel (уменьшенный вид) — без ГРПШ/ГРПБ' : 'Excel — без ГРПШ/ГРПБ'}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => window.print()}>
            Печать / PDF (обоснование)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Сохранить в историю</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            value={histName}
            onChange={(e) => setHistName(e.target.value)}
            placeholder={input.objectName || `Расчет ${new Date().toLocaleDateString('ru-RU')}`}
          />
          <p className="text-xs text-muted-foreground">
            Если имя не ввести, в истории будет использовано наименование объекта.
          </p>
          <Button
            variant="secondary" className="w-full"
            onClick={() => { void saveToHistory(histName); setHistName(''); }}
          >
            Сохранить расчёт
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
