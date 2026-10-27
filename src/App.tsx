import { useState } from 'react';
import { AppProvider, useApp } from '@/store/AppState';
import bgGas from '@/assets/bg-gas.jpg';
import CalcPage from '@/pages/CalcPage';import TotalsPage from '@/pages/TotalsPage';
import JustificationPage from '@/pages/JustificationPage';
import EhzPage from '@/pages/EhzPage';
import RefsPage from '@/pages/RefsPage';
import HistoryPage from '@/pages/HistoryPage';
import RegressionPage from '@/pages/RegressionPage';

type Tab = 'calc' | 'totals' | 'just' | 'ehz' | 'refs' | 'history' | 'regress';

const TABS: { id: Tab; label: string }[] = [
  { id: 'calc', label: 'Расчет' },
  { id: 'totals', label: 'Итоги' },
  { id: 'just', label: 'Обоснование' },
  { id: 'refs', label: 'Справочники' },
  { id: 'history', label: 'История' },
  { id: 'regress', label: 'Сверка' },
];

function Landing({ onSelect }: { onSelect: (mode: 'tp' | 'stroy') => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-8">
      <h1 className="text-center text-lg font-bold leading-snug sm:text-xl">
        Расчет стоимости строительства газопровода по НЦС 81-02-15
      </h1>
      <p className="text-center text-sm text-muted-foreground">Выберите вид расчёта:</p>
      <button
        onClick={() => onSelect('tp')}
        className="w-full max-w-md rounded-xl border-2 border-primary bg-card p-5 text-left shadow-sm transition-colors hover:bg-primary/5"
      >
        <div className="text-base font-bold text-primary">Расчет стоимости ТП</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Технологическое присоединение: с налогом на прибыль и ставками C7.1 / C7.2
          (мониторинг выполнения ТУ и фактическое подключение).
        </div>
      </button>
      <button
        onClick={() => onSelect('stroy')}
        className="w-full max-w-md rounded-xl border-2 border-primary bg-card p-5 text-left shadow-sm transition-colors hover:bg-primary/5"
      >
        <div className="text-base font-bold text-primary">Расчет стоимости строительства</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Без налога на прибыль и без ставок C7.1 / C7.2. Уменьшенный вид итогов и экспорта.
        </div>
      </button>
    </div>
  );
}

function ModeSwitch({ mode, onChange }: { mode: 'tp' | 'stroy'; onChange: (m: 'tp' | 'stroy') => void }) {
  const base = 'shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors';
  return (
    <div className="mt-2 flex gap-1">
      <button
        onClick={() => onChange('tp')}
        className={`${base} ${mode === 'tp' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
      >
        Расчет стоимости ТП
      </button>
      <button
        onClick={() => onChange('stroy')}
        className={`${base} ${mode === 'stroy' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
      >
        Расчет стоимости строительства
      </button>
    </div>
  );
}

function Shell() {
  const [tab, setTab] = useState<Tab>('calc');
  const { input, setInput } = useApp();
  const mode = input.mode ?? null;

  if (mode === null) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
        <div
          aria-hidden
          className="app-bg no-print"
          style={{
            backgroundImage: `linear-gradient(rgba(16,22,27,0.9), rgba(16,22,27,0.94)), url(${bgGas})`,
          }}
        />
        <Landing onSelect={(m) => setInput((p) => ({ ...p, mode: m }))} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <div
        aria-hidden
        className="app-bg no-print"
        style={{
          backgroundImage: `linear-gradient(rgba(16,22,27,0.9), rgba(16,22,27,0.94)), url(${bgGas})`,
        }}
      />
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur no-print">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-sm font-bold leading-tight sm:text-base">
            Расчет стоимости строительства газопровода по НЦС 81-02-15
          </h1>
          <input
            className="w-40 rounded-md border bg-transparent px-2 py-1 text-xs"
            placeholder="Расчет подготовил"
            value={input.preparedBy}
            onChange={(e) => setInput((p) => ({ ...p, preparedBy: e.target.value }))}
          />
        </div>
        <nav className="mt-2 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <ModeSwitch mode={mode} onChange={(m) => setInput((p) => ({ ...p, mode: m }))} />
      </header>
      <main className="flex-1 px-4 pt-4">
        {tab === 'calc' && <CalcPage />}
        {tab === 'totals' && <TotalsPage />}
        {tab === 'just' && <JustificationPage />}
        {tab === 'ehz' && <EhzPage />}
        {tab === 'refs' && <RefsPage />}
        {tab === 'history' && <HistoryPage />}
        {tab === 'regress' && <RegressionPage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
