import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CalcInput, Section } from '@/engine/types';
import { parseNum } from '@/lib/format';

interface SectionGroupProps {
  title: string;
  hint?: string;
  value: Section[];
  onChange: (next: Section[]) => void;
  lenLabel?: string;
  diamLabel?: string;
}

export function SectionGroup({ title, hint, value, onChange, lenLabel = 'Длина, м', diamLabel = 'Диаметр, мм' }: SectionGroupProps) {
  const set = (i: number, field: 'len' | 'diam', raw: string) => {
    const v = parseNum(raw);
    const next = value.map((s, idx) => (idx === i ? { ...s, [field]: v } : s));
    onChange(next);
  };
  const display = (v: number | null) => (v === null ? '' : String(v));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        {value.map((s, i) => (
          <div key={i} className="flex items-end gap-2">
            <span className="w-6 pb-2 text-xs text-muted-foreground">{i + 1}</span>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">{lenLabel}</Label>
              <Input
                inputMode="decimal"
                value={display(s.len)}
                onChange={(e) => set(i, 'len', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">{diamLabel}</Label>
              <Input
                inputMode="numeric"
                value={display(s.diam)}
                onChange={(e) => set(i, 'diam', e.target.value)}
                placeholder="—"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: string;
}

export function NumberField({ label, value, onChange, hint }: NumberFieldProps) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        inputMode="decimal"
        value={value === null ? '' : String(value)}
        onChange={(e) => onChange(parseNum(e.target.value))}
        placeholder="0"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface PointConnectionProps {
  point: CalcInput['point'];
  onChange: (p: CalcInput['point']) => void;
}

export function PointConnection({ point, onChange }: PointConnectionProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">ТОЧКА ПОДКЛЮЧЕНИЯ — СТАВКИ C7.1 И C7.2</CardTitle>
        <p className="text-xs text-muted-foreground">
          Для полиэтиленового газопровода способ прокладки при подборе ставок не учитывается.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Материал газопровода</Label>
          <Select
            value={point.material}
            onValueChange={(v) => onChange({ ...point, material: v as CalcInput['point']['material'] })}
          >
            <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Сталь">Сталь</SelectItem>
              <SelectItem value="Полиэтилен">Полиэтилен</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {point.material === 'Сталь' && (
          <div>
            <Label className="text-xs text-muted-foreground">Способ прокладки</Label>
            <Select
              value={point.laying}
              onValueChange={(v) => onChange({ ...point, laying: v as CalcInput['point']['laying'] })}
            >
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Надземная">Надземная</SelectItem>
                <SelectItem value="Подземная">Подземная</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Давление, МПа"
            value={point.pressure}
            onChange={(v) => onChange({ ...point, pressure: v })}
          />
          <NumberField
            label="Диаметр, мм"
            value={point.diam}
            onChange={(v) => onChange({ ...point, diam: v })}
          />
        </div>
        {point.pressure !== null && (point.pressure < 0 || point.pressure > 1.2) && (
          <p className="text-xs font-medium text-destructive">
            Ошибка: давление должно быть от 0 до 1,2 МПа
          </p>
        )}
      </CardContent>
    </Card>
  );
}
