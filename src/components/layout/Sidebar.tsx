import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Hexagon,
  LogOut,
  ShieldCheck,
  User,
  Eye,
  Inbox,
  Settings,
  ClipboardList,
  Users,
  LayoutDashboard,
  FileText,
  Package,
  Boxes,
} from "lucide-react";
import { logoutUserAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { CurrencySelector } from "./CurrencySelector";
import { MobileSidebar } from "./MobileSidebar";

const navLinkClass =
  "px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm font-medium";

export async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Rol kontrolü
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  const role = profile?.role || "sales";
  const isSuperAdmin = role === "admin";
  const name = profile?.full_name || user.email?.split("@")[0] || "Kullanıcı";

  // Admin: Bekleyen talep sayısını göster
  let pendingRequestCount = 0;
  if (isSuperAdmin) {
    const { count } = await supabase
      .from("system_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    pendingRequestCount = count || 0;
  }

  // Okunmamış teklif bildirimleri (Badge)
  let unreadQuoteCount = 0;
  if (isSuperAdmin) {
    const { count } = await supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("is_read_by_admin", false);
    unreadQuoteCount = count || 0;
  } else {
    // Sales role
    const { count } = await supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user.id)
      .in("status", ["accepted", "rejected"])
      .eq("is_read_by_sales", false);
    unreadQuoteCount = count || 0;
  }

  // Vadesi gelen/gecikmiş görev sayısı (Dashboard rozeti)
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
  const { count: dueTaskCountRaw } = await dueTaskQuery;
  const dueTaskCount = dueTaskCountRaw || 0;

  return (
    <>
      {/* Mobil üst çubuk (lg altı) — sidebar yerine hamburger menü açar */}
      <div className="lg:hidden sticky top-0 z-50 bg-slate-900 text-slate-100 border-b border-slate-800">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/sales/dashboard" className="flex items-center gap-2">
            <Hexagon className="h-6 w-6 text-brand-400" fill="currentColor" fillOpacity={0.2} />
            <span className="font-bold text-lg tracking-tight">Adapsis</span>
          </Link>
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

      {/* Masaüstü sol sidebar */}
      <nav className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 bg-slate-900 text-slate-100 h-screen sticky top-0">
        <Link href="/sales/dashboard" className="flex items-center gap-2 px-5 h-14 shrink-0 border-b border-slate-800">
          <Hexagon className="h-6 w-6 text-brand-400" fill="currentColor" fillOpacity={0.2} />
          <span className="font-bold text-lg tracking-tight">Adapsis</span>
        </Link>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <Link href="/sales/dashboard" className={`${navLinkClass} relative`}>
            <LayoutDashboard className="w-4 h-4 opacity-70 shrink-0" /> Dashboard
            {dueTaskCount > 0 && (
              <span
                title="Vadesi gelen/gecikmiş görevler"
                className="ml-auto flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold leading-none text-white bg-red-500 shrink-0"
              >
                {dueTaskCount}
              </span>
            )}
          </Link>

          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1">
            Satış &amp; CRM
          </div>
          <Link href="/sales/quotes" className={`${navLinkClass} relative`}>
            <FileText className="w-4 h-4 opacity-70 shrink-0" /> Teklifler
            {unreadQuoteCount > 0 && (
              <span className="absolute top-2 left-6 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </Link>
          <Link href="/shared/customers" className={navLinkClass}>
            <Users className="w-4 h-4 opacity-70 shrink-0" /> Müşteriler
          </Link>
          {!isSuperAdmin && (
            <Link href="/sales/requests" className={navLinkClass}>
              <ClipboardList className="w-4 h-4 opacity-70 shrink-0" /> Taleplerim
            </Link>
          )}

          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1">
            Ürün &amp; Stok
          </div>
          <Link href="/admin/products" className={navLinkClass}>
            <Package className="w-4 h-4 opacity-70 shrink-0" /> Ürün Kataloğu
            {!isSuperAdmin && (
              <span title="Sadece Görüntüleme" className="ml-auto">
                <Eye className="w-4 h-4 text-slate-500 opacity-70" />
              </span>
            )}
          </Link>
          <Link href="/admin/inventory" className={navLinkClass}>
            {isSuperAdmin ? <ShieldCheck className="w-4 h-4 opacity-70 shrink-0" /> : <Boxes className="w-4 h-4 opacity-70 shrink-0" />}
            Envanter
            {!isSuperAdmin && (
              <span title="Sadece Görüntüleme" className="ml-auto">
                <Eye className="w-4 h-4 text-slate-500 opacity-70" />
              </span>
            )}
          </Link>

          {isSuperAdmin && (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1">
                Yönetim
              </div>
              <Link href="/admin/requests" className={navLinkClass}>
                <Inbox className="w-4 h-4 opacity-70 shrink-0" /> Talepler
                {pendingRequestCount > 0 && (
                  <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold leading-none text-white bg-red-500 animate-pulse shrink-0">
                    {pendingRequestCount}
                  </span>
                )}
              </Link>
              <Link href="/admin/settings" className={navLinkClass}>
                <Settings className="w-4 h-4 opacity-70 shrink-0" /> Ayarlar
              </Link>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-800 p-3 space-y-3">
          <CurrencySelector />
          <div className="flex items-center gap-2 text-sm px-1">
            <div className="bg-slate-800 rounded-full p-1.5 border border-slate-700 shrink-0">
              <User className="h-4 w-4 text-slate-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-slate-200 leading-none truncate">{name}</span>
              <span className="text-[10px] text-brand-400 mt-0.5 uppercase tracking-wider font-bold">{role}</span>
            </div>
          </div>
          <form action={logoutUserAction}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 h-9 px-3"
            >
              <LogOut className="h-4 w-4 mr-2" /> Çıkış Yap
            </Button>
          </form>
        </div>
      </nav>
    </>
  );
}
