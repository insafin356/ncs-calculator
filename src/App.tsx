import { useState } from 'react';
import { AppProvider, useApp } from '@/store/AppState';
import CalcPage from '@/pages/CalcPage';
import TotalsPage from '@/pages/TotalsPage';
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
  { id: 'ehz', label: 'ЭХЗ' },
  { id: 'refs', label: 'Справочники' },
  { id: 'history', label: 'История' },
  { id: 'regress', label: 'Сверка' },
];

function Shell() {
  const [tab, setTab] = useState<Tab>('calc');
  const { input, setInput } = useApp();

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur no-print">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-bold">Калькулятор НЦС · 2026</h1>
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
