"use client";

import React, { useEffect, useState } from "react";
import { useGlobalStore } from "@/store/global-store";
import { ChevronDown } from "lucide-react";

export function CurrencySelector() {
  const { globalCurrency, setGlobalCurrency } = useGlobalStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-20 bg-slate-800 rounded animate-pulse" />;
  }

  return (
    <div className="relative">
      <select
        value={globalCurrency}
        onChange={(e) => setGlobalCurrency(e.target.value)}
        className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-md pl-3 pr-8 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 hover:bg-slate-700 transition-colors"
      >
        {["TRY", "USD", "EUR", "GBP", "CHF", "JPY"].map((cur) => (
          <option key={cur} value={cur}>
            {cur}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
    </div>
  );
}
