import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/store/AppState';
import { computeEhz, EHZ_POSITIONS, ehzLenEquivalent } from '@/engine/engine';
import { fmt, parseNum } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { NumberField } from './components';

export default function EhzPage() {
  const { ehzInput, setEhzInput, input, setInput, ehzLinked, setEhzLinked } = useApp();
  const r = computeEhz(ehzInput);

  const setPrice = (i: number, raw: string) => {
    const v = parseNum(raw) ?? 0;
    setEhzInput((p) => ({ ...p, prices: p.prices.map((x, j) => (j === i ? v : x)) }));
  };

  const applyToCalc = () => {
    const eq = ehzLenEquivalent(r.total);
    setInput((p) => ({ ...p, ehzLen: Math.round(eq * 100) / 100 }));
    setEhzLinked(true);
  };

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">1. Исходные данные и принятые параметры</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            Защищаемая протяженность подземного стального газопровода:{' '}
            <b>{fmt((input.steelOpen ?? []).reduce((a, s) => a + (s.len ?? 0), 0), 1)} м</b>
            <p className="mt-1 text-xs text-muted-foreground">
              Формируется автоматически как сумма участков подземного стального газопровода на вкладке «Расчет».
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Количество независимых участков, шт" value={ehzInput.sections} onChange={(v) => setEhzInput((p) => ({ ...p, sections: v }))} />
            <NumberField label="Количество СКЗ, шт" value={ehzInput.skz} onChange={(v) => setEhzInput((p) => ({ ...p, skz: v }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Тип анодного заземлителя</Label>
            <Select value={ehzInput.azType} onValueChange={(v) => setEhzInput((p) => ({ ...p, azType: v as typeof p.azType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Глубинное">Глубинное</SelectItem>
                <SelectItem value="Поверхностное">Поверхностное</SelectItem>
                <SelectItem value="Групповое">Групповое</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Количество АЗ, шт" value={ehzInput.azCount} onChange={(v) => setEhzInput((p) => ({ ...p, azCount: v }))} />
            <NumberField label="Анодных элементов в одном АЗ, шт" value={ehzInput.anodesPerAz} onChange={(v) => setEhzInput((p) => ({ ...p, anodesPerAz: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Кабель от СКЗ до АЗ, м" value={ehzInput.cableAz} onChange={(v) => setEhzInput((p) => ({ ...p, cableAz: v }))} />
            <NumberField label="Кабель от СКЗ до трубопровода, м" value={ehzInput.cablePipe} onChange={(v) => setEhzInput((p) => ({ ...p, cablePipe: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="КИП, шт" value={ehzInput.kip} onChange={(v) => setEhzInput((p) => ({ ...p, kip: v }))} />
            <NumberField label="ЭИС, шт" value={ehzInput.eis} onChange={(v) => setEhzInput((p) => ({ ...p, eis: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Пусконаладочные работы, компл." value={ehzInput.pnr} onChange={(v) => setEhzInput((p) => ({ ...p, pnr: v }))} />
            <NumberField label="Прочие работы, тыс. ₽" value={ehzInput.other} onChange={(v) => setEhzInput((p) => ({ ...p, other: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Коэффициент ПИР" value={ehzInput.pirCoeff} onChange={(v) => setEhzInput((p) => ({ ...p, pirCoeff: v }))} />
            <NumberField label="Коэфф. актуализации" value={ehzInput.actualCoeff} onChange={(v) => setEhzInput((p) => ({ ...p, actualCoeff: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">2. Состав системы ЭХЗ и расчет СМР (базовые цены)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {EHZ_POSITIONS.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-xs">{i + 1}. {name}</span>
              <Input
                className="w-24"
                inputMode="decimal"
                value={i === 10 ? (ehzInput.other === null ? '' : String(ehzInput.other)) : (ehzInput.prices[i] === 0 ? '' : String(ehzInput.prices[i]))}
                onChange={(e) => (i === 10
                  ? setEhzInput((p) => ({ ...p, other: parseNum(e.target.value) }))
                  : setPrice(i, e.target.value))}
                placeholder="цена"
              />
              <span className="w-20 text-right text-xs font-medium">
                {i === 10
                  ? fmt((ehzInput.other ?? 0), 1)
                  : fmt(r.rows[i].cost, 1)}
              </span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Позиция 11 «Прочие работы» берёт сумму из поля «Прочие работы, тыс. ₽» выше.
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="space-y-1 pt-4 text-sm">
          <div className="flex justify-between"><span>Итого СМР ЭХЗ (с НДС)</span><b>{fmt(r.smr)} тыс. ₽</b></div>
          <div className="flex justify-between"><span>ПИР, экспертиза и проверка достоверности</span><b>{fmt(r.pir)} тыс. ₽</b></div>
          <div className="flex justify-between text-base"><span>ИТОГО ЭХЗ</span><b className="text-primary">{fmt(r.total)} тыс. ₽</b></div>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={applyToCalc}>
        Подставить в расчёт (строка «ЭХЗ, м»)
      </Button>
      {ehzLinked && input.ehzLen !== null && (
        <p className="text-center text-xs text-muted-foreground">
          Подставлено условной длины: {fmt(input.ehzLen)} м → {fmt(input.ehzLen * 8.5 * 1.1)} тыс. ₽
        </p>
      )}
    </div>
  );
}
