import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/store/AppState';
import { parseNcsXml } from '@/engine/ncsXml';
import { importC7File, validateC7Coverage } from '@/engine/c7import';
import type { C7Entry, NcsEntry } from '@/engine/types';
import { fmt, parseNum } from '@/lib/format';

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString('ru-RU');
}

export default function RefsPage() {
  const { ref, refMeta, importNcs, importC7, saveConsts, rollback } = useApp();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [c7Preview, setC7Preview] = useState<C7Entry[] | null>(null);
  const [c7Errors, setC7Errors] = useState<string[]>([]);
  const [c7FileName, setC7FileName] = useState('');
  const ncsFileRef = useRef<HTMLInputElement>(null);
  const c7FileRef = useRef<HTMLInputElement>(null);

  const say = (ok: boolean, text: string) => setMsg({ ok, text });

  // ---------- НЦС ----------
  const handleNcsFile = async (file: File) => {
    const text = await file.text();
    const targets = new Set(ref.ncs15.map((n) => n.code));
    const res = parseNcsXml(text, targets);
    if (res.parseError) { say(false, res.parseError); return; }
    if (res.values.size === 0) {
      say(false, 'В XML-файле не найдены показатели НЦС. Проверьте, что выбран XML нужного сборника из КонсультантПлюс.');
      return;
    }
    const missing = ref.ncs15.filter((n) => !res.values.has(n.code)).map((n) => n.code);
    const entries: NcsEntry[] = ref.ncs15.map((n) => {
      const v = res.values.get(n.code);
      return v ? { ...n, total: v[0], pir: v[1], control: v[2] } : n;
    });
    await importNcs(entries, file.name);
    say(true, `НЦС обновлено из «${file.name}»: заполнено кодов ${res.values.size}, не найдено ${missing.length}${missing.length ? `: ${missing.join(', ')}` : ''}. Справочник СМР пересчитан автоматически.`);
  };

  // ---------- C7 ----------
  const handleC7File = async (file: File) => {
    const res = await importC7File(file);
    if (res.entries.length === 0) {
      setC7Preview(null);
      setC7Errors(res.errors);
      say(false, 'Файл не распознан. ' + res.errors[0]);
      return;
    }
    const warnings = validateC7Coverage(res.entries);
    setC7Preview(res.entries);
    setC7Errors([...res.errors, ...warnings.map((w) => 'Нет комбинации: ' + w)]);
    setC7FileName(file.name);
    say(res.errors.length === 0, `Распознано ставок: ${res.entries.length}${warnings.length ? `. Внимание: не покрыты ${warnings.length} комбинаций (список ниже) — по ним ставки не будут находиться.` : '. Покрытие полное.'}`);
  };

  const confirmC7 = async () => {
    if (!c7Preview) return;
    await importC7(c7Preview, c7FileName);
    say(true, `Ставки C7.1/C7.2 обновлены (${c7Preview.length} шт.) из «${c7FileName}».`);
    setC7Preview(null);
  };

  const [consts, setConsts] = useState({
    wirePrice: ref.spr4.wirePrice, grpF16: ref.spr4.grpF16, grpG16: ref.spr4.grpG16,
    valka: ref.spr7.valka, komp: ref.spr7.komp, uhod: ref.spr7.uhod,
  });

  const ncsImported = refMeta.ncs15;
  const c7Imported = refMeta.c7;
  const constsImported = refMeta.consts;

  return (
    <div className="space-y-4 pb-4">
      {msg && (
        <div className={`rounded-md border px-3 py-2 text-sm ${msg.ok ? 'border-green-300 bg-green-50 text-green-900' : 'border-red-300 bg-red-50 text-red-900'}`}>
          {msg.text}
          <button className="ml-2 underline" onClick={() => setMsg(null)}>закрыть</button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Показатели НЦС (сборник 81-02-15-2026)</CardTitle>
          <p className="text-xs text-muted-foreground">
            {ncsImported
              ? `Версия от ${fmtDate(ncsImported.importedAt)} · файл «${ncsImported.sourceName}»`
              : 'Встроенная версия от 12.08.2026 (из Excel-калькулятора)'}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Кодов в таблице: {ref.ncs15.length}</span>
            <Badge variant="secondary">{ncsImported ? 'обновлено пользователем' : 'исходные данные'}</Badge>
          </div>
          <input ref={ncsFileRef} type="file" accept=".xml" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleNcsFile(f); e.target.value = ''; }} />
          <Button className="w-full" onClick={() => ncsFileRef.current?.click()}>
            Загрузить XML из КонсультантПлюс
          </Button>
          {ncsImported && (
            <Button variant="outline" className="w-full" onClick={() => { void rollback('ncs15').then(() => say(true, 'Возвращена предыдущая версия НЦС.')); }}>
              Откатить к предыдущей версии
            </Button>
          )}
          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground">Просмотр значений ({ref.ncs15.length})</summary>
            <div className="mt-2 max-h-64 overflow-auto text-xs">
              <table className="w-full">
                <thead><tr className="text-left"><th>Код</th><th className="text-right">Строительство</th><th className="text-right">ПИР</th><th className="text-right">Контроль</th></tr></thead>
                <tbody>
                  {ref.ncs15.map((n) => (
                    <tr key={n.code}><td className="font-mono">{n.code}</td>
                      <td className="text-right">{fmt(n.total)}</td>
                      <td className="text-right">{fmt(n.pir)}</td>
                      <td className="text-right">{fmt(n.control)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ставки C7.1 / C7.2 (таблица 88 ставок)</CardTitle>
          <p className="text-xs text-muted-foreground">
            {c7Imported
              ? `Версия от ${fmtDate(c7Imported.importedAt)} · «${c7Imported.sourceName}»`
              : 'Встроенная версия из Excel-калькулятора'}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <input ref={c7FileRef} type="file" accept=".xlsx,.xls,.xlsm,.csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleC7File(f); e.target.value = ''; }} />
          <Button className="w-full" onClick={() => c7FileRef.current?.click()}>
            Загрузить таблицу ставок (Excel/CSV)
          </Button>
          {c7Imported && (
            <Button variant="outline" className="w-full" onClick={() => { void rollback('c7').then(() => say(true, 'Возвращена предыдущая версия ставок.')); }}>
              Откатить к предыдущей версии
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Формат: строки с «C7.1»/«C7.2» в первой колонке, далее материал, положение, группа давления, группа диаметра, ед., ставка, пункт — как на листе «Для расчетов».
          </p>
          {c7Preview && (
            <div className="space-y-2 rounded-md border border-primary/40 bg-primary/5 p-2">
              <p className="text-sm font-medium">Новая версия: {c7Preview.length} ставок из «{c7FileName}»</p>
              {c7Errors.length > 0 && (
                <div className="max-h-32 overflow-auto text-xs text-amber-700">
                  {c7Errors.slice(0, 30).map((e, i) => <div key={i}>• {e}</div>)}
                  {c7Errors.length > 30 && <div>… и ещё {c7Errors.length - 30}</div>}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void confirmC7()}>Применить</Button>
                <Button size="sm" variant="ghost" onClick={() => setC7Preview(null)}>Отмена</Button>
              </div>
            </div>
          )}
          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground">Просмотр ставок ({ref.c7.length})</summary>
            <div className="mt-2 max-h-64 overflow-auto text-xs">
              <table className="w-full">
                <thead><tr className="text-left"><th>Тип</th><th>Материал</th><th>Положение</th><th>Давление</th><th>Диаметр</th><th className="text-right">Ставка</th><th>Пункт</th></tr></thead>
                <tbody>
                  {ref.c7.map((e, i) => (
                    <tr key={i}><td>{e.type}</td><td>{e.material}</td><td>{e.laying}</td><td>{e.pressure}</td><td>{e.diam}</td>
                      <td className="text-right">{fmt(e.rate)}</td><td>{e.punkt}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Прочие константы</CardTitle>
          <p className="text-xs text-muted-foreground">
            {constsImported ? `Изменены ${fmtDate(constsImported.importedAt)}` : 'Значения из Excel-калькулятора'}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {([
            ['wirePrice', 'Провод-спутник, тыс. ₽/м'],
            ['grpF16', 'ГРПШ/ГРПБ — СМР, руб./шт'],
            ['grpG16', 'ГРПШ/ГРПБ — ПИР, руб./шт'],
            ['valka', 'Валка деревьев, руб./м²'],
            ['komp', 'Компенсационное озеленение, руб./м²'],
            ['uhod', '3-х летний уход, руб./м²'],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input inputMode="decimal" value={String(consts[k])}
                onChange={(e) => setConsts((c) => ({ ...c, [k]: parseNum(e.target.value) ?? 0 }))} />
            </div>
          ))}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { void saveConsts(consts); say(true, 'Константы сохранены.'); }}>Сохранить</Button>
            {constsImported && (
              <Button size="sm" variant="outline" onClick={() => { void rollback('consts').then(() => say(true, 'Константы возвращены.')); }}>Откатить</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
