import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Hexagon } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { MobileSidebar } from "./MobileSidebar";
import { CurrencySelector } from "./CurrencySelector";
import { LanguageSelector } from "./LanguageSelector";
import { dictionary } from "@/lib/i18n/dictionary";

/**
 * Tam genişlik üst navbar — sidebar'ın da üstünden geçer (bkz. layout.tsx
 * dosyalarındaki flex-col>flex-row yapısı). Logo + global arama + (mobilde)
 * hamburger menü burada; nav linkleri ve rozet sayaçları hâlâ Sidebar.tsx'te.
 * Bu bileşen Sidebar'ın çocuğu değil kardeşi olduğundan (layout.tsx'te ayrı
 * render edilir), auth/rol/sayaç sorgularını kendi başına tekrarlar —
 * paylaşılan bir "nav data" helper'ı yok; 20 kişilik ekip ölçeğinde bu küçük
 * indexlenmiş sorgu tekrarı performans sorunu yaratmaz.
 */
export async function TopNavbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  const role = profile?.role || "sales";
  const isSuperAdmin = role === "admin";
  const name = profile?.full_name || user.email?.split("@")[0] || dictionary.tr["topNavbar.defaultUserName"];

  // Bağımsız rozet sayaçlarını paralel çalıştırıyoruz (bkz. Sidebar.tsx) —
  // sıralı await'ler bu bileşen her navigasyonda render olduğu için gezinme
  // gecikmesini doğrudan artırıyordu.
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  let dueTaskQuery = supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")
    .lte("due_date", endOfToday.toISOString());
  if (!isSuperAdmin) {
    dueTaskQuery = dueTaskQuery.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
  }

  const unreadQuoteQuery = isSuperAdmin
    ? supabase
        .from("quotes")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("is_read_by_admin", false)
    : supabase
        .from("quotes")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .in("status", ["accepted", "rejected"])
        .eq("is_read_by_sales", false);

  const [pendingRequestResult, unreadQuoteResult, dueTaskResult] = await Promise.all([
    isSuperAdmin
      ? supabase.from("system_requests").select("*", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
    unreadQuoteQuery,
    dueTaskQuery,
  ]);

  const pendingRequestCount = pendingRequestResult.count || 0;
  const unreadQuoteCount = unreadQuoteResult.count || 0;
  const dueTaskCount = dueTaskResult.count || 0;

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900 text-slate-100 border-b border-slate-800">
      <div className="flex items-center h-14">
        {/* Logo alanı masaüstünde Sidebar ile aynı genişlikte (lg:w-60) —
            arama kutusu böylece sidebar'ın bittiği yerden başlar, içerik
            alanıyla hizalanır. */}
        <Link
          href="/sales/dashboard"
          className="flex items-center gap-2 px-4 lg:px-5 lg:w-60 lg:shrink-0"
        >
          <Hexagon className="h-6 w-6 text-brand-400" fill="currentColor" fillOpacity={0.2} />
          <span className="font-bold text-lg tracking-tight">Adapsis</span>
        </Link>

        <div className="flex-1 flex items-center min-w-0 gap-4 pr-4 lg:pr-6">
          <div className="hidden lg:block w-full max-w-md">
            <GlobalSearch variant="bar" isAdmin={isSuperAdmin} />
          </div>
          <div className="lg:hidden ml-auto">
            <GlobalSearch variant="icon" registerShortcut={false} isAdmin={isSuperAdmin} />
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 pr-4 shrink-0">
          <LanguageSelector />
          <CurrencySelector />
        </div>

        <div className="lg:hidden pr-4">
          <MobileSidebar
            isSuperAdmin={isSuperAdmin}
            unreadQuoteCount={unreadQuoteCount}
            pendingRequestCount={pendingRequestCount}
            dueTaskCount={dueTaskCount}
            userName={name}
            role={role}
          />
        </div>
      </div>
    </header>
  );
}
