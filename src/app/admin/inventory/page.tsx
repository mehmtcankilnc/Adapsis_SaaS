import { createClient } from "@/lib/supabase/server";
import { Search, Layers } from "lucide-react";
import InventoryTableClient from "./InventoryTableClient";
import AddInventoryButton from "./AddInventoryButton";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const supabase = await createClient();

  // Role kontrolü
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
  const role = profile?.role || 'sales'

  // Gerçek zamanlı stok durumlarını çek
  const { data: inventory, error } = await supabase
    .from("inventory")
    .select("*")
    .order("item_name");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Üst Bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between h-auto py-5 sm:h-20 sm:py-0 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
                <Layers className="h-6 w-6 text-brand-600 mr-2" /> Stok ve Ham
                Madde Yönetimi
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Üretime girecek parçaların eş zamanlı envanter durumu.
              </p>
            </div>

            {role !== 'sales' && <AddInventoryButton />}
          </div>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tablo Kartı (Client Component Üzerinden Modal Destekli) */}
        <InventoryTableClient inventory={inventory || []} role={role} />
      </main>
    </div>
  );
}
