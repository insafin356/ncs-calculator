import { useMemo } from 'react';
import { useApp } from '@/store/AppState';
import { buildJustification, type JustSection } from '@/engine/justification';
import { fmt } from '@/lib/format';

function Section({ s }: { s: JustSection }) {
  if (s.kind === 'text') {
    return (
      <section className="mb-4">
        {s.title && <h2 className="mb-1 bg-[#5B9BD5] px-2 py-1 text-sm font-bold text-white">{s.title}</h2>}
        <p className="border px-2 py-1 text-sm whitespace-pre-line">{s.text}</p>
      </section>
    );
  }
  if (s.kind === 'kv') {
    return (
      <section className="mb-4">
        {s.title && <h2 className="mb-1 bg-[#5B9BD5] px-2 py-1 text-sm font-bold text-white">{s.title}</h2>}
        <table className="w-full border-collapse text-sm">
          <tbody>
            {s.kv!.map(([k, v], i) => (
              <tr key={i}>
                <td className="w-1/2 border bg-gray-100 px-2 py-1 font-medium">{k}</td>
                <td className="border px-2 py-1">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }
  if (s.kind === 'table') {
    return (
      <section className="mb-4">
        {s.title && <h2 className="mb-1 bg-[#5B9BD5] px-2 py-1 text-sm font-bold text-white">{s.title}</h2>}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {s.headers!.map((h, i) => (
                  <th key={i} className="border bg-[#4472C4] px-1 py-1 text-left font-semibold text-white">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.rows!.map((r, i) => (
                <tr key={i} className={String(r[1]).startsWith('ИТОГО') ? 'font-semibold bg-[#E2EFDA]' : ''}>
                  {r.map((c, j) => (
                    <td key={j} className="border px-1 py-1">{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }
  // check
  const ok = Math.abs(s.checks![0].calc - s.checks![0].summary) < 0.01 &&
             Math.abs(s.checks![1].calc - s.checks![1].summary) < 0.01;
  return (
    <section className="mb-4">
      {s.title && <h2 className="mb-1 bg-[#5B9BD5] px-2 py-1 text-sm font-bold text-white">{s.title}</h2>}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border bg-[#4472C4] px-2 py-1 text-left text-white">Показатель</th>
            <th className="border bg-[#4472C4] px-2 py-1 text-left text-white">По таблице 6</th>
            <th className="border bg-[#4472C4] px-2 py-1 text-left text-white">По листу «Итоги»</th>
            <th className="border bg-[#4472C4] px-2 py-1 text-left text-white">Отклонение</th>
          </tr>
        </thead>
        <tbody>
          {s.checks!.map((c, i) => (
            <tr key={i}>
              <td className="border px-2 py-1">{c.name}</td>
              <td className="border px-2 py-1">{fmt(c.calc)}</td>
              <td className="border px-2 py-1">{fmt(c.summary)}</td>
              <td className="border px-2 py-1">{fmt(c.calc - c.summary)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`mt-1 border px-2 py-1 text-center text-sm font-semibold ${ok ? 'bg-[#C6EFCE] text-[#006100]' : 'bg-[#FFC7CE] text-[#9C0006]'}`}>
        {ok ? 'Контроль итогов таблицы 6: СОВПАДАЕТ' : 'ВНИМАНИЕ: РАСХОЖДЕНИЕ'}
      </p>
    </section>
  );
}

export default function JustificationPage() {
  const { input, rows, totals } = useApp();
  const just = useMemo(() => buildJustification(input, rows, totals), [input, rows, totals]);

  return (
    <div className="pb-4">
      <div id="justification-print" className="mx-auto max-w-[210mm] bg-white p-2 text-black">
        <h1 className="mb-1 bg-[#1F4E79] px-2 py-2 text-center text-sm font-bold text-white">
          РАСШИФРОВКА УКРУПНЕННОГО РАСЧЕТА СТОИМОСТИ ТЕХНОЛОГИЧЕСКОГО ПРИСОЕДИНЕНИЯ
        </h1>
        <p className="mb-3 text-center text-sm font-semibold">Пояснительная информация к листу «Итоги»</p>
        <p className="mb-1 text-sm"><b>Объект:</b> {just.objectName}</p>
        <p className="mb-3 text-sm"><b>Дата формирования:</b> {just.date}{just.preparedBy ? ` · Расчет подготовил: ${just.preparedBy}` : ''}</p>
        {just.sections.map((s, i) => <Section key={i} s={s} />)}
      </div>
      <button
        className="no-print mt-4 w-full rounded-md bg-primary py-2 text-primary-foreground"
        onClick={() => window.print()}
      >
        Печать / сохранить в PDF
      </button>
    </div>
  );
}
