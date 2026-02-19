import { useCallback, useEffect, useState } from "react";
import type { Trade } from "@tradevera/shared";
import type { TradeFilters } from "@/lib/api";
import { api } from "@/lib/api";

export function useTrades(initialFilters: TradeFilters = {}) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filters, setFilters] = useState<TradeFilters>(initialFilters);
  const [loading, setLoading] = useState(true);

  const loadTrades = useCallback(async (nextFilters?: TradeFilters) => {
    setLoading(true);
    try {
      const query = nextFilters ?? filters;
      const response = await api.listTrades(query);
      setTrades(response.trades);
      if (nextFilters) {
        setFilters(nextFilters);
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTrades(initialFilters).catch((error) => {
      console.error("Failed to load trades", error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    trades,
    setTrades,
    loading,
    filters,
    setFilters,
    loadTrades
  };
}
