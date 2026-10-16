import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useRef, useState } from 'react';
import type { CalcInput, Section } from '@/engine/types';
import { parseNum } from '@/lib/format';

interface SectionGroupProps {
  title: string;
  hint?: string;
  value: Section[];
  onChange: (next: Section[]) => void;
  lenLabel?: string;
  diamLabel?: string;
  tone?: 'steel' | 'pe' | 'tp';
}

type Tone = NonNullable<SectionGroupProps['tone']>;

const tones: Record<Tone, { card: string; input: string; badge: string; badgeText: string }> = {
  // светло-зелёный — стальные трубы (как группа «СТАЛЬ» в Excel)
  steel: {
    card: 'border-green-300 bg-green-50/60',
    input: 'border-green-200 bg-green-50 focus-visible:ring-green-400',
    badge: 'bg-green-200 text-green-900',
    badgeText: 'СТАЛЬ',
  },
  // светло-синий — ПЭ трубы (полиэтилен)
  pe: {
    card: 'border-blue-300 bg-blue-50/60',
    input: 'border-blue-200 bg-blue-50 focus-visible:ring-blue-400',
    badge: 'bg-blue-200 text-blue-900',
    badgeText: 'ПЭ',
  },
  // зелёный — всё, что касается ТП (как блок «ТП» в Excel)
  tp: {
    card: 'border-[#92D050] bg-[#E2F0D9]/70',
    input: 'border-[#A9D08E] bg-[#E2F0D9] focus-visible:ring-[#92D050]',
    badge: 'bg-[#92D050] text-green-950',
    badgeText: 'ТП',
  },
};

// Числовое поле с черновым текстом: позволяет вводить «0,3» посимвольно,
// не «сглатывая» запятую, и не затирает ввод при промежуточных состояниях.
interface NumInputProps {
  value: number | null;
  onChange: (v: number | null) => void;
  inputMode?: 'decimal' | 'numeric';
  placeholder?: string;
  className?: string;
}

export function NumInput({ value, onChange, inputMode = 'decimal', placeholder, className }: NumInputProps) {
  const [text, setText] = useState(value === null ? '' : String(value));
  useEffect(() => {
    setText((t) => {
      const v = parseNum(t);
      return v === value ? t : value === null ? '' : String(value);
    });
  }, [value]);
  return (
    <Input
      inputMode={inputMode}
      value={text}
      placeholder={placeholder}
      className={className}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const v = parseNum(raw);
        if (v !== null || raw.trim() === '') onChange(v);
      }}
      onBlur={() => setText(value === null ? '' : String(value))}
    />
  );
}

export function SectionGroup({ title, hint, value, onChange, lenLabel = 'Длина, м', diamLabel = 'Диаметр, мм', tone }: SectionGroupProps) {
  const set = (i: number, field: 'len' | 'diam', v: number | null) => {
    const next = value.map((s, idx) => (idx === i ? { ...s, [field]: v } : s));
    onChange(next);
  };
  // Показываем минимум один участок; остальные скрыты под «+».
  // Заполненные участки (например, из истории) раскрываются автоматически.
  const filledCount = value.filter((s) => s.len !== null || s.diam !== null).length;
  const [extra, setExtra] = useState(0);
  // Сброс раскрытых участков при замене массива на пустой (кнопка «Очистить данные»)
  const prevValue = useRef(value);
  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      if (filledCount === 0 && extra > 0) setExtra(0);
    }
  });
  const visible = Math.min(value.length, Math.max(1, filledCount) + extra);
  const t = tone ? tones[tone] : null;
  return (
    <Card className={t?.card}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {t && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${t.badge}`}>{t.badgeText}</span>}
          {title}
        </CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        {value.slice(0, visible).map((s, i) => (
          <div key={i} className="flex items-end gap-2">
            <span className="w-6 pb-2 text-xs text-muted-foreground">{i + 1}</span>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">{lenLabel}</Label>
              <NumInput
                inputMode="decimal"
                value={s.len}
                onChange={(v) => set(i, 'len', v)}
                placeholder="0"
                className={t?.input}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">{diamLabel}</Label>
              <NumInput
                inputMode="numeric"
                value={s.diam}
                onChange={(v) => set(i, 'diam', v)}
                placeholder="—"
                className={t?.input}
              />
            </div>
          </div>
        ))}
        {visible < value.length && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setExtra((e) => e + 1)}
          >
            + Добавить участок {visible + 1}
          </Button>
        )}
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
      <NumInput value={value} onChange={onChange} placeholder="0" />
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
    <Card className="border-[#70AD47] bg-[#E2F0D9]/50">
      <CardHeader className="rounded-t-xl bg-[#70AD47] pb-2">
        <CardTitle className="text-sm font-semibold text-white">ТОЧКА ПОДКЛЮЧЕНИЯ — СТАВКИ C7.1 И C7.2</CardTitle>
        <p className="text-xs text-green-50">
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
