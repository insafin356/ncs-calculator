import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/store/AppState';
import { REGRESSION_CASES, runRegressionCase } from '@/engine/regression';
import { fmt } from '@/lib/format';

export default function RegressionPage() {
  const { ref, refMeta } = useApp();
  const results = useMemo(() => REGRESSION_CASES.map((c) => runRegressionCase(ref, c)), [ref]);

  const ncsInfo = refMeta.ncs15 ? `импортирован ${refMeta.ncs15.sourceName}` : 'встроенная версия (12.08.2026)';
  const c7Info = refMeta.c7 ? `импортирован ${refMeta.c7.sourceName}` : 'встроенная версия (из Excel)';
  const allPass = results.every((r) => r.passed);

  return (
    <div className="space-y-4 pb-4">
      <Card className={allPass ? 'border-green-600/40 bg-green-50 dark:bg-green-950/30' : 'border-destructive/40 bg-destructive/5'}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {allPass ? '✓ Все эталонные кейсы совпадают с Excel' : '✗ Есть расхождения с Excel'}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            НЦС 15: {ncsInfo} · Ставки C7: {c7Info}
          </p>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Проверка выполняется против текущих справочников — после обновления НЦС или C7
          зайдите сюда и убедитесь, что итоги по-прежнему сходятся с Excel-калькулятором.
        </CardContent>
      </Card>

      {results.map((r) => (
        <Card key={r.name}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {r.passed ? '✓' : '✗'} {r.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            {r.checks.map((ch) => (
              <div key={ch.key} className="flex items-center justify-between gap-2 py-1">
                <span className="text-muted-foreground">{ch.label}</span>
                <span className={ch.pass ? '' : 'font-semibold text-destructive'}>
                  {typeof ch.actual === 'number' ? fmt(ch.actual) : (ch.actual || '—')}
                  {!ch.pass && (
                    <span className="ml-2 text-xs">
                      (Excel: {typeof ch.expected === 'number' ? fmt(ch.expected) : ch.expected})
                    </span>
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
