import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/store/AppState';
import { emptyInput, sectionDiamOptions } from '@/engine/engine';
import { fmt } from '@/lib/format';
import { useMemo, useState } from 'react';
import { NumberField, PointConnection, SectionGroup } from './components';

export default function CalcPage() {
  const { input, setInput, totals, rows, hasErrors, ref } = useApp();
  const set = (patch: Partial<typeof input>) => setInput((prev) => ({ ...prev, ...patch }));
  const [confirmClear, setConfirmClear] = useState(false);

  const diam = useMemo(() => ({
    steelAbove: sectionDiamOptions(ref, 'steelAbove'),
    steelOpen: sectionDiamOptions(ref, 'steelOpen'),
    casing: sectionDiamOptions(ref, 'casing'),
    steelHDD: sectionDiamOptions(ref, 'steelHDD'),
    pullST: sectionDiamOptions(ref, 'pullST'),
    pipesST: sectionDiamOptions(ref, 'pipesST'),
    tpOpen: sectionDiamOptions(ref, 'tpOpen'),
    tpHDD: sectionDiamOptions(ref, 'tpHDD'),
    peOpen: sectionDiamOptions(ref, 'peOpen'),
    peHDD: sectionDiamOptions(ref, 'peHDD'),
    pullPE: sectionDiamOptions(ref, 'pullPE'),
    pipesPE: sectionDiamOptions(ref, 'pipesPE'),
  }), [ref]);

  const clearAll = () => {
    setInput(() => emptyInput());
    setConfirmClear(false);
  };

  const ehzRow = rows.find((r) => r.key === 'ehz');
  const filledCount = rows.length;

  return (
    <div className="space-y-4 pb-4">
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Объект</Label>
              <Input
                value={input.objectName}
                onChange={(e) => set({ objectName: e.target.value })}
                placeholder="Строительство наружного газопровода до границы земельного участка"
              />
            </div>
            {confirmClear ? (
              <div className="flex shrink-0 gap-1 pt-4">
                <Button size="sm" variant="destructive" onClick={clearAll}>Очистить</Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmClear(false)}>Отмена</Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="mt-4 shrink-0 text-muted-foreground"
                onClick={() => setConfirmClear(true)}
              >
                Очистить данные
              </Button>
            )}
          </div>
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

      <div className="flex flex-wrap gap-2 text-[11px] font-medium">
        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-900">■ ПЭ (полиэтилен)</span>
        <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-green-900">■ Сталь</span>
        <span className="rounded-full border border-[#92D050] bg-[#E2F0D9] px-2 py-1 text-green-950">■ ТП</span>
      </div>

      <SectionGroup
        title="Монтаж надземного газопровода (сталь)"
        hint="Справочники 1 и 2, до 3 участков"
        value={input.steelAbove}
        onChange={(v) => set({ steelAbove: v })}
        tone="steel"
        diamOptions={diam.steelAbove}
      />
      <SectionGroup
        title="Укладка СТ подземного газопровода (открытый способ)"
        value={input.steelOpen}
        onChange={(v) => set({ steelOpen: v })}
        tone="steel"
        diamOptions={diam.steelOpen}
      />
      <SectionGroup
        title="Устройство стального футляра"
        value={input.casing}
        onChange={(v) => set({ casing: v })}
        tone="steel"
        diamOptions={diam.casing}
      />
      <SectionGroup
        title="Устройство ННБ (сталь)"
        hint="Справочник 3"
        value={input.steelHDD}
        onChange={(v) => set({ steelHDD: v })}
        tone="steel"
        diamOptions={diam.steelHDD}
      />
      <SectionGroup
        title="Протаскивание в футляр СТ труб"
        hint="Справочник 5"
        value={input.pullST}
        onChange={(v) => set({ pullST: v })}
        tone="steel"
        diamOptions={diam.pullST}
      />
      <SectionGroup
        title="Стоимость СТ труб"
        value={input.pipesST}
        onChange={(v) => set({ pipesST: v })}
        tone="steel"
        diamOptions={diam.pipesST}
      />
      <SectionGroup
        title="Укладка ПЭ газопровода ТП (открытый способ)"
        hint="Справочник 6"
        value={input.tpOpen}
        onChange={(v) => set({ tpOpen: v })}
        tone="tp"
        diamOptions={diam.tpOpen}
      />
      <SectionGroup
        title="ННБ ТП ПЭ"
        value={input.tpHDD}
        onChange={(v) => set({ tpHDD: v })}
        tone="tp"
        diamOptions={diam.tpHDD}
      />
      <SectionGroup
        title="Укладка ПЭ газопровода (открытый способ)"
        value={input.peOpen}
        onChange={(v) => set({ peOpen: v })}
        tone="pe"
        diamOptions={diam.peOpen}
      />
      <SectionGroup
        title="Устройство ННБ (ПЭ)"
        value={input.peHDD}
        onChange={(v) => set({ peHDD: v })}
        tone="pe"
        diamOptions={diam.peHDD}
      />
      <SectionGroup
        title="Протаскивание в футляр ПЭ труб"
        value={input.pullPE}
        onChange={(v) => set({ pullPE: v })}
        tone="pe"
        diamOptions={diam.pullPE}
      />
      <SectionGroup
        title="Стоимость ПЭ труб"
        hint="Участки 2 и 3 — с коэффициентом 1,1 (как в Excel)"
        value={input.pipesPE}
        onChange={(v) => set({ pipesPE: v })}
        tone="pe"
        diamOptions={diam.pipesPE}
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
            hint="Стоимость = длина × 8 500 ₽/м × 1,1."
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
