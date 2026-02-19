import { useMemo, useState } from "react";
import type { Trade } from "@tradevera/shared";
import { Camera, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface TradeTableProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onScreens: (trade: Trade) => void;
  onDelete: (trade: Trade) => Promise<void>;
}

type SortKey = "opened_at" | "symbol" | "pnl";

export function TradeTable({ trades, onEdit, onScreens, onDelete }: TradeTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("opened_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedTrades = useMemo(() => {
    const rows = [...trades];
    rows.sort((a, b) => {
      let result = 0;

      if (sortKey === "opened_at") {
        result = a.opened_at.localeCompare(b.opened_at);
      } else if (sortKey === "symbol") {
        result = a.symbol.localeCompare(b.symbol);
      } else {
        result = Number(a.pnl ?? 0) - Number(b.pnl ?? 0);
      }

      return sortDir === "asc" ? result : -result;
    });

    return rows;
  }, [sortDir, sortKey, trades]);

  const changeSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir("desc");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-ink-100/70 text-left text-ink-800">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => changeSort("symbol")} className="font-semibold">
                  Symbol
                </button>
              </th>
              <th className="px-4 py-3">Direction</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => changeSort("pnl")} className="font-semibold">
                  PnL
                </button>
              </th>
              <th className="px-4 py-3">Setup</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedTrades.map((trade) => (
              <tr key={trade.id} className="border-t border-ink-100">
                <td className="px-4 py-3 text-ink-700">{new Date(trade.opened_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-semibold text-ink-900">{trade.symbol}</td>
                <td className="px-4 py-3">
                  <Badge tone={trade.direction === "long" ? "success" : "warning"}>{trade.direction}</Badge>
                </td>
                <td className="px-4 py-3 text-ink-800">{formatNumber(Number(trade.size), 3)}</td>
                <td className={`px-4 py-3 font-semibold ${Number(trade.pnl ?? 0) >= 0 ? "text-mint-500" : "text-coral-500"}`}>
                  {formatCurrency(Number(trade.pnl ?? 0))}
                </td>
                <td className="px-4 py-3 text-ink-700">{trade.setup ?? "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => onScreens(trade)}>
                      <Camera className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onEdit(trade)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => onDelete(trade)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
