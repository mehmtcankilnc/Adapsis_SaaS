"use server";

import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";

export interface GlobalSearchResult {
  customers: { id: string; company_name: string; contact_name: string | null; email: string | null }[];
  quotes: { id: string; customer_company: string; customer_contact: string | null; final_price: number; currency: string; status: string }[];
  products: { id: string; name: string; sku: string }[];
}

/**
 * Müşteri/teklif/ürün üzerinde tek seferde arama. PostgREST join'li bir
 * sütunu (products.name) quotes ile aynı .ilike() sorgusunda
 * birleştiremediğinden, üç bağımsız sorgu paralel çalıştırılır. Her
 * kategorinin hatası ayrı yakalanır — biri başarısız olursa diğerleri
 * boş dönmez.
 */
export async function globalSearchAction(
  query: string,
): Promise<{ success: boolean; data?: GlobalSearchResult; error?: string }> {
  const q = query.trim();
  if (q.length < 2) {
    return { success: true, data: { customers: [], quotes: [], products: [] } };
  }

  try {
    const supabase = await createClient();
    // PostgREST'in .or() filtre string sözdiziminde `,` koşulları ayırır,
    // `%` ilike joker karakteridir — ham kullanıcı girdisi bunları
    // içerirse filtre string'i bozulur.
    const escaped = q.replace(/[%,]/g, "");

    const [customersRes, quotesRes, productsRes] = await Promise.all([
      supabase
        .from("customers")
        .select("id, company_name, contact_name, email")
        .or(`company_name.ilike.%${escaped}%,contact_name.ilike.%${escaped}%,email.ilike.%${escaped}%`)
        .limit(5),
      supabase
        .from("quotes")
        .select("id, customer_company, customer_contact, final_price, currency, status")
        .or(`customer_company.ilike.%${escaped}%,customer_contact.ilike.%${escaped}%`)
        .limit(5),
      supabase
        .from("products")
        .select("id, name, sku")
        .or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%`)
        .eq("is_active", true)
        .limit(5),
    ]);

    if (customersRes.error) console.error("Global Arama - Müşteri Hatası:", customersRes.error.message);
    if (quotesRes.error) console.error("Global Arama - Teklif Hatası:", quotesRes.error.message);
    if (productsRes.error) console.error("Global Arama - Ürün Hatası:", productsRes.error.message);

    return {
      success: true,
      data: {
        customers: customersRes.error ? [] : customersRes.data || [],
        quotes: quotesRes.error ? [] : quotesRes.data || [],
        products: productsRes.error ? [] : productsRes.data || [],
      },
    };
  } catch (error: unknown) {
    console.error("Global Arama Hatası:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
