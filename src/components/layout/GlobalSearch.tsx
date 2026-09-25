"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, FileText, Package, Loader2, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { globalSearchAction, type GlobalSearchResult } from "@/actions/global-search.actions";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

const QUOTE_STATUS_KEYS: Record<string, DictionaryKey> = {
  pending: "sales.quotes.detail.status.pending",
  accepted: "sales.quotes.detail.status.accepted",
  rejected: "sales.quotes.detail.status.rejected",
  pending_admin_approval: "sales.quotes.detail.status.pendingAdminApproval",
};

function ResultGroup({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <Icon className="w-3 h-3" /> {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ResultRow({ onClick, primary, secondary }: { onClick: () => void; primary: string; secondary?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 transition-colors flex flex-col"
    >
      <span className="text-sm font-medium text-slate-800 truncate">{primary}</span>
      {secondary && <span className="text-xs text-slate-500 truncate">{secondary}</span>}
    </button>
  );
}

export function GlobalSearch({
  variant,
  registerShortcut = true,
  isAdmin = false,
}: {
  variant: "bar" | "icon";
  registerShortcut?: boolean;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useLanguage();

  // Palet açılırken önceki sorgu/sonuçlar sıfırlanır — eski sonuçlar bir
  // sonraki açılışta sızmasın. Bir effect yerine, paleti her açan yerde
  // (kısayol + iki tetikleyici buton) çağrılan tek bir yardımcı ile yapılır.
  const openPalette = () => {
    setQuery("");
    setResults(null);
    setOpen(true);
  };

  // Ctrl/Cmd+K: her yerden paleti açar. Masaüstü nav her genişlikte DOM'da
  // kalıp sadece CSS ile gizlendiğinden, bu listener yalnızca bir
  // instance'ta (Sidebar.tsx, registerShortcut=true) etkinleştirilir —
  // aksi halde iki instance aynı anda iki palet açardı.
  useEffect(() => {
    if (!registerShortcut) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [registerShortcut]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Sorgu 2 karakterden kısaysa hiç istek atma; render zaten sonuçları
    // ve yükleme göstergesini `query.trim().length >= 2` şartına bağlıyor,
    // bu yüzden burada state sıfırlamaya gerek yok.
    if (query.trim().length < 2) return;

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await globalSearchAction(query);
      if (res.success && res.data) setResults(res.data);
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const isQueryLongEnough = query.trim().length >= 2;
  const hasResults =
    results && (results.customers.length > 0 || results.quotes.length > 0 || results.products.length > 0);

  return (
    <>
      {variant === "bar" ? (
        <button
          type="button"
          onClick={openPalette}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors text-sm"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">{t("common.search")}</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 shrink-0">
            Ctrl K
          </kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={openPalette}
          className="p-2 -mr-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label={t("search.ariaLabel")}
        >
          <Search className="h-5 w-5" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        {/* Global arama sayfanın herhangi bir yerinden (başka bir dialog açıkken
            de) tetiklenebilir; DOM sırasına bağlı z-index çakışmasında sayfanın
            kendi dialogunun üstte kalmaması için burada z-index bilerek daha
            yüksek tutulur — global arama her zaman en üstte olmalı. */}
        <DialogContent className="sm:max-w-lg p-0" overlayClassName="z-[100]">
          <div className="p-3 pr-10 border-b border-slate-100 flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <Input
              autoFocus
              placeholder={t("search.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
            />
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {!isQueryLongEnough && (
              <p className="text-sm text-slate-400 text-center py-8">{t("search.minChars")}</p>
            )}
            {isQueryLongEnough && loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            )}
            {isQueryLongEnough && !loading && results && (
              <>
                {!hasResults && (
                  <p className="text-sm text-slate-400 text-center py-8">{t("search.noResults")}</p>
                )}
                {results.customers.length > 0 && (
                  <ResultGroup title={t("search.groupCustomers")} icon={Users}>
                    {results.customers.map((c) => (
                      <ResultRow
                        key={c.id}
                        onClick={() => go(`/shared/customers/${c.id}`)}
                        primary={c.company_name}
                        secondary={c.contact_name || c.email || undefined}
                      />
                    ))}
                  </ResultGroup>
                )}
                {results.quotes.length > 0 && (
                  <ResultGroup title={t("search.groupQuotes")} icon={FileText}>
                    {results.quotes.map((q) => (
                      <ResultRow
                        key={q.id}
                        onClick={() => go(`/sales/quotes/${q.id}`)}
                        primary={q.customer_company}
                        secondary={`${q.final_price} ${q.currency} · ${
                          QUOTE_STATUS_KEYS[q.status] ? t(QUOTE_STATUS_KEYS[q.status]) : q.status
                        }`}
                      />
                    ))}
                  </ResultGroup>
                )}
                {results.products.length > 0 && (
                  <ResultGroup title={t("search.groupProducts")} icon={Package}>
                    {results.products.map((p) => (
                      <ResultRow
                        key={p.id}
                        // Ürün düzenleme sayfası admin-only (bkz. product-edit.actions.ts
                        // içindeki assertAdmin) — sales için ürün detayına özel bir
                        // görüntüleme rotası yok, sadece katalog listesinden "Talep
                        // Oluştur" akışı var. Bu yüzden sales kullanıcısını listeye
                        // yönlendiriyoruz, admin'i doğrudan düzenleme sayfasına.
                        onClick={() => go(isAdmin ? `/admin/products/${p.id}/edit` : "/admin/products")}
                        primary={p.name}
                        secondary={p.sku}
                      />
                    ))}
                  </ResultGroup>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
