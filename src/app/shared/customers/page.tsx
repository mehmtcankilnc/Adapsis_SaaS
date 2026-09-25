import { createClient } from "@/lib/supabase/server";
import { CustomersClient } from "./CustomersClient";
import { Users } from "lucide-react";
import { T } from "@/components/layout/T";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data: customers, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Müşteriler çekilirken hata:", error);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col py-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
              <Users className="h-6 w-6 text-brand-600 mr-2" /> <T k="customers.pageTitle" />
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              <T k="customers.pageDescription" />
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CustomersClient initialCustomers={customers || []} />
      </main>
    </div>
  );
}
