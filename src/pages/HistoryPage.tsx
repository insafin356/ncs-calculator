import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useApp } from '@/store/AppState';
import { fmt } from '@/lib/format';

export default function HistoryPage() {
  const { history, loadFromHistory, removeHistory } = useApp();

  return (
    <div className="space-y-3 pb-4">
      {history.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            История пустая. Сохраняйте расчёты кнопкой «Сохранить в историю» на вкладке «Итоги».
          </CardContent>
        </Card>
      ) : (
        history.map((h) => (
          <Card key={h.id}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{h.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.ts).toLocaleString('ru-RU')}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold text-primary">{fmt(h.totals.grand)} тыс. ₽</div>
                  <div className="text-xs text-muted-foreground">
                    СМР {fmt(h.totals.smr)} · ПИР {fmt(h.totals.pir)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => loadFromHistory(h)}>
                  Открыть
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void removeHistory(h.id)}>
                  Удалить
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
