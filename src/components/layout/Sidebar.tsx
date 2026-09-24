import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  ShieldCheck,
  Eye,
  Inbox,
  Settings,
  ClipboardList,
  Users,
  LayoutDashboard,
  FileText,
  Package,
  Boxes,
  TrendingUp,
} from "lucide-react";
import { UserMenu } from "./UserMenu";
import { T } from "./T";

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
    // Masaüstü sol sidebar — logo ve global arama artık TopNavbar'da (bkz.
    // layout.tsx); bu nav sadece linkler+rozetler içerir, TopNavbar'ın
    // (h-14) altından başlar.
    <nav className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 bg-slate-900 text-slate-100 h-[calc(100vh-3.5rem)] sticky top-14">
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <Link href="/sales/dashboard" className={`${navLinkClass} relative`}>
            <LayoutDashboard className="w-4 h-4 opacity-70 shrink-0" /> <T k="nav.dashboard" />
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
            <T k="nav.salesCrm" />
          </div>
          <Link href="/sales/quotes" className={`${navLinkClass} relative`}>
            <FileText className="w-4 h-4 opacity-70 shrink-0" /> <T k="nav.quotes" />
            {unreadQuoteCount > 0 && (
              <span className="absolute top-2 left-6 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </Link>
          <Link href="/shared/customers" className={navLinkClass}>
            <Users className="w-4 h-4 opacity-70 shrink-0" /> <T k="nav.customers" />
          </Link>
          {!isSuperAdmin && (
            <Link href="/sales/requests" className={navLinkClass}>
              <ClipboardList className="w-4 h-4 opacity-70 shrink-0" /> <T k="nav.myRequests" />
            </Link>
          )}

          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1">
            <T k="nav.productStock" />
          </div>
          <Link href="/admin/products" className={navLinkClass}>
            <Package className="w-4 h-4 opacity-70 shrink-0" /> <T k="nav.productCatalog" />
            {!isSuperAdmin && (
              <span title="Sadece Görüntüleme" className="ml-auto">
                <Eye className="w-4 h-4 text-slate-500 opacity-70" />
              </span>
            )}
          </Link>
          <Link href="/admin/inventory" className={navLinkClass}>
            {isSuperAdmin ? <ShieldCheck className="w-4 h-4 opacity-70 shrink-0" /> : <Boxes className="w-4 h-4 opacity-70 shrink-0" />}
            <T k="nav.inventory" />
            {!isSuperAdmin && (
              <span title="Sadece Görüntüleme" className="ml-auto">
                <Eye className="w-4 h-4 text-slate-500 opacity-70" />
              </span>
            )}
          </Link>

          {isSuperAdmin && (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1">
                <T k="nav.management" />
              </div>
              <Link href="/admin/requests" className={navLinkClass}>
                <Inbox className="w-4 h-4 opacity-70 shrink-0" /> <T k="nav.requests" />
                {pendingRequestCount > 0 && (
                  <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold leading-none text-white bg-red-500 animate-pulse shrink-0">
                    {pendingRequestCount}
                  </span>
                )}
              </Link>
              <Link href="/admin/pipeline" className={navLinkClass}>
                <TrendingUp className="w-4 h-4 opacity-70 shrink-0" /> <T k="nav.pipeline" />
              </Link>
              <Link href="/admin/settings" className={navLinkClass}>
                <Settings className="w-4 h-4 opacity-70 shrink-0" /> <T k="nav.settings" />
              </Link>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-800 p-3">
          <UserMenu name={name} role={role} />
        </div>
      </nav>
  );
}
