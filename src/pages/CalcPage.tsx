import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/store/AppState';
import { fmt } from '@/lib/format';
import { NumberField, PointConnection, SectionGroup } from './components';

export default function CalcPage() {
  const { input, setInput, totals, rows, hasErrors } = useApp();
  const set = (patch: Partial<typeof input>) => setInput((prev) => ({ ...prev, ...patch }));

  const ehzRow = rows.find((r) => r.key === 'ehz');
  const filledCount = rows.length;

  return (
    <div className="space-y-4 pb-4">
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="pt-4">
          <Label className="text-xs text-muted-foreground">Объект</Label>
          <Input
            value={input.objectName}
            onChange={(e) => set({ objectName: e.target.value })}
            placeholder="Строительство наружного газопровода до границы земельного участка"
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">СМР + ПИР без НДС</div>
              <div className="text-lg font-semibold">{fmt(totals.base)} тыс. ₽</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">ВСЕГО ПО РАСЧЕТУ</div>
              <div className="text-lg font-semibold text-primary">{fmt(totals.grand)} тыс. ₽</div>
            </div>
          </div>
          {hasErrors && (
            <p className="mt-2 text-xs font-medium text-destructive">
              Есть строки с ошибками подбора — проверьте диаметры (раздел «Проверка» ниже).
            </p>
          )}
        </CardContent>
      </Card>

      <SectionGroup
        title="Монтаж надземного газопровода (сталь)"
        hint="Справочники 1 и 2, до 3 участков"
        value={input.steelAbove}
        onChange={(v) => set({ steelAbove: v })}
      />
      <SectionGroup
        title="Укладка СТ подземного газопровода (открытый способ)"
        value={input.steelOpen}
        onChange={(v) => set({ steelOpen: v })}
      />
      <SectionGroup
        title="Устройство стального футляра"
        value={input.casing}
        onChange={(v) => set({ casing: v })}
      />
      <SectionGroup
        title="Устройство ННБ (сталь)"
        hint="Справочник 3"
        value={input.steelHDD}
        onChange={(v) => set({ steelHDD: v })}
      />
      <SectionGroup
        title="Протаскивание в футляр СТ труб"
        hint="Справочник 5"
        value={input.pullST}
        onChange={(v) => set({ pullST: v })}
      />
      <SectionGroup
        title="Стоимость СТ труб"
        value={input.pipesST}
        onChange={(v) => set({ pipesST: v })}
      />
      <SectionGroup
        title="Укладка ПЭ газопровода ТП (открытый способ)"
        hint="Справочник 6"
        value={input.tpOpen}
        onChange={(v) => set({ tpOpen: v })}
      />
      <SectionGroup
        title="ННБ ТП ПЭ"
        value={input.tpHDD}
        onChange={(v) => set({ tpHDD: v })}
      />
      <SectionGroup
        title="Укладка ПЭ газопровода (открытый способ)"
        value={input.peOpen}
        onChange={(v) => set({ peOpen: v })}
      />
      <SectionGroup
        title="Устройство ННБ (ПЭ)"
        value={input.peHDD}
        onChange={(v) => set({ peHDD: v })}
      />
      <SectionGroup
        title="Протаскивание в футляр ПЭ труб"
        value={input.pullPE}
        onChange={(v) => set({ pullPE: v })}
      />
      <SectionGroup
        title="Стоимость ПЭ труб"
        hint="Участки 2 и 3 — с коэффициентом 1,1 (как в Excel)"
        value={input.pipesPE}
        onChange={(v) => set({ pipesPE: v })}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Оборудование и дополнительные работы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Монтаж ГРПБ, шт" value={input.grpb} onChange={(v) => set({ grpb: v })} />
            <NumberField label="Монтаж ГРПШ, шт" value={input.grpsh} onChange={(v) => set({ grpsh: v })} />
          </div>
          <NumberField
            label="ЭХЗ, м (условная длина)"
            value={input.ehzLen}
            onChange={(v) => set({ ehzLen: v })}
            hint="Стоимость = длина × 8 500 ₽/м × 1,1. Итог мини-калькулятора ЭХЗ подставляется на вкладке «ЭХЗ»."
          />
          {ehzRow && (
            <p className="text-xs text-muted-foreground">
              Стоимость ЭХЗ в расчёте: {fmt(ehzRow.total)} тыс. ₽ (СМР {fmt(ehzRow.smr)} + ПИР {fmt(ehzRow.pir)})
            </p>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Тип территории</Label>
            <Select
              value={input.areaType}
              onValueChange={(v) => set({ areaType: v as typeof input.areaType })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Лесопарковые зоны населенных пунктов">Лесопарковые зоны населенных пунктов</SelectItem>
                <SelectItem value="Лесной фонд">Лесной фонд</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NumberField
            label="Площадь (валка/озеленение/уход), м²"
            value={input.treesArea}
            onChange={(v) => set({ treesArea: v })}
            hint={
              input.areaType === 'Лесной фонд'
                ? 'Лесной фонд: компенсация = 1/3 стоимости, трёхлетний уход не начисляется.'
                : 'Компенсационное озеленение и трёхлетний уход начисляются на ту же площадь.'
            }
          />
        </CardContent>
      </Card>

      <PointConnection point={input.point} onChange={(p) => set({ point: p })} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Проверка строк расчёта</CardTitle>
        </CardHeader>
        <CardContent>
          {filledCount === 0 ? (
            <p className="text-sm text-muted-foreground">Заполненных строк нет.</p>
          ) : (
            <div className="space-y-1">
              {rows.map((r) => (
                <div key={r.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {r.error ? (
                      <span className="text-destructive">{r.label}: {r.error}</span>
                    ) : (
                      <span>{r.label}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium">
                    {Number.isFinite(r.total) ? `${fmt(r.total)} тыс. ₽` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
