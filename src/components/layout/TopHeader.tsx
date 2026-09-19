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
} from "lucide-react";
import { logoutUserAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { CurrencySelector } from "./CurrencySelector";
import { MobileNav } from "./MobileNav";

export async function TopHeader() {
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

  return (
    <nav className="relative bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo ve Menüler */}
          <div className="flex items-center gap-8">
            <Link
              href="/sales/dashboard"
              className="flex items-center gap-2 group"
            >
              <Hexagon
                className="h-6 w-6 text-brand-400 group-hover:text-brand-300 transition-colors"
                fill="currentColor"
                fillOpacity={0.2}
              />
              <span className="font-bold text-lg tracking-tight">Adapsis</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1 font-medium text-sm">
              <Link
                href="/sales/dashboard"
                className="px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/sales/quotes"
                className="px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors relative flex items-center"
              >
                Teklifler
                {unreadQuoteCount > 0 && (
                  <span className="absolute top-2 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </Link>
              {!isSuperAdmin && (
                <Link
                  href="/sales/requests"
                  className="px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  Taleplerim
                </Link>
              )}
              <div className="w-[1px] h-4 bg-slate-700 mx-2"></div>
              <Link
                href="/admin/products"
                className="px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                Ürün Kataloğu
                {!isSuperAdmin && (
                  <span title="Sadece Görüntüleme">
                    <Eye className="w-4 h-4 text-slate-500 opacity-70" />
                  </span>
                )}
              </Link>
              <Link
                href="/admin/inventory"
                className={`px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${isSuperAdmin ? "text-amber-200 hover:text-amber-100 hover:bg-slate-800" : "text-slate-300 hover:text-white hover:bg-slate-800"}`}
              >
                {isSuperAdmin && <ShieldCheck className="w-4 h-4 opacity-70" />} Envanter
                {!isSuperAdmin && (
                  <span title="Sadece Görüntüleme">
                    <Eye className="w-4 h-4 text-slate-500 opacity-70" />
                  </span>
                )}
              </Link>
              {isSuperAdmin && (
                <>
                  <div className="w-[1px] h-4 bg-slate-700 mx-2"></div>
                  <Link
                    href="/admin/requests"
                    className="px-3 py-2 rounded-md text-amber-200 hover:text-amber-100 hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <Inbox className="w-4 h-4 opacity-70" /> Talepler
                    {pendingRequestCount > 0 && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold leading-none text-white bg-red-500 animate-pulse">
                        {pendingRequestCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/admin/settings"
                    className="px-3 py-2 rounded-md text-amber-200 hover:text-amber-100 hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4 opacity-70" /> Ayarlar
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Kullanıcı Profili ve Çıkış */}
          <div className="flex items-center gap-4">
            <CurrencySelector />
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <div className="bg-slate-800 rounded-full p-1.5 border border-slate-700">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-slate-200 leading-none">
                  {name}
                </span>
                <span className="text-[10px] text-brand-400 mt-0.5 uppercase tracking-wider font-bold">
                  {role}
                </span>
              </div>
            </div>

            <form action={logoutUserAction}>
              <Button
                type="submit"
                variant="ghost"
                className="text-slate-400 hover:text-white hover:bg-slate-800 h-9 px-3"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Çıkış Yap</span>
              </Button>
            </form>

            <MobileNav
              isSuperAdmin={isSuperAdmin}
              unreadQuoteCount={unreadQuoteCount}
              pendingRequestCount={pendingRequestCount}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
