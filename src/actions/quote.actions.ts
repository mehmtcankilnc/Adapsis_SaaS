"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Teklif konfigürasyonunu Postgres JSONB-uyumlu array formatına dönüştürür.
 * Store'dan gelen `selections` bir obje (Record<variant_id, option_value>).
 * Postgres trigger'ı JSONB array bekler; obje gönderilirse "cannot extract elements from an object" hatası oluşur.
 */
function normalizeConfigurationToArray(
  selections: Record<string, string>,
  variants?: any[],
): any[] {
  // selections objesini array'e çevir
  const configArray: any[] = [];

  for (const [variantId, optionValue] of Object.entries(selections)) {
    const entry: any = {
      variant_id: variantId,
      selected_value: optionValue,
    };

    // Eğer variant bilgisi varsa, stok bilgilerini de ekle
    if (variants && Array.isArray(variants)) {
      const variant = variants.find((v: any) => v.id === variantId);
      if (variant && variant.options) {
        const selectedOption = variant.options.find(
          (o: any) => o.value === optionValue,
        );
        if (selectedOption) {
          entry.label = selectedOption.label;
          if (selectedOption.inventory_item_id) {
            entry.inventory_id = selectedOption.inventory_item_id;
            entry.required_amount = selectedOption.required_amount || 1;
          }
        }
      }
    }

    configArray.push(entry);
  }

  return configArray;
}

export async function createQuoteAction(data: {
  product_id: string;
  customer_id: string;
  customer_contact?: string;
  configuration: any;
  base_price_snapshot: number;
  final_price: number;
  currency: string;
  variants?: any[];
  discount_percentage?: number;
}) {
  let isSuccess = false;
  let errorMsg = null;

  try {
    const supabase = await createClient();

    // Authenticated user bilgisini al
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    if (!data.customer_id) {
      return { success: false, error: "Müşteri seçimi zorunludur." };
    }

    // JSONB uyumluluğu: Configuration objesini array formatına çevir
    const configArray = Array.isArray(data.configuration)
      ? data.configuration
      : normalizeConfigurationToArray(data.configuration, data.variants);

    // Müşteri adını veritabanından çek (Yedek olarak customer_company alanına yazmak için)
    let customerCompanyFallback = "Bilinmeyen Müşteri";
    const { data: customerData } = await supabase
      .from("customers")
      .select("company_name")
      .eq("id", data.customer_id)
      .single();

    if (customerData) {
      customerCompanyFallback = customerData.company_name;
    }

    // İskonto hesaplama
    const discountPct = Math.max(0, Math.min(100, data.discount_percentage || 0));
    const discountedPrice = data.final_price * (1 - discountPct / 100);

    // İskonto hiyerarşisi: %5'ten büyük indirimler admin onayı gerektirir
    let quoteStatus = "pending";
    if (discountPct > 5) {
      quoteStatus = "pending_admin_approval";
    }

    const { error } = await supabase.from("quotes").insert({
      product_id: data.product_id,
      customer_id: data.customer_id,
      customer_company: customerCompanyFallback,
      customer_contact: data.customer_contact || null,
      configuration: configArray,
      base_price_snapshot: data.base_price_snapshot,
      final_price: discountedPrice,
      currency: data.currency,
      status: quoteStatus,
      discount_percentage: discountPct,
      created_by: user.id,
      is_read_by_admin: false,
      is_read_by_sales: true,
    });

    if (error) {
      console.error("Teklif Kayıt Hatası:", error);
      errorMsg = error.message;
    } else {
      isSuccess = true;
    }
  } catch (error: any) {
    console.error("Action Failed:", error);
    errorMsg = error.message;
  }

  // Next.js redirect metodu try-catch içindeyken "NEXT_REDIRECT" hatası fırlatma mekanizmasını bozduğu için dışarıda çağrılmalıdır.
  if (isSuccess) {
    revalidatePath("/sales/quotes");
    redirect("/sales/quotes");
  }

  return { success: false, error: errorMsg };
}

export async function updateQuoteStatusAction(
  quoteId: string,
  status: "accepted" | "rejected",
) {
  try {
    const supabase = await createClient();

    // Önce teklifi çek (stok düşme işlemi için configuration + product bilgisi lazım)
    const { data: quote, error: fetchErr } = await supabase
      .from("quotes")
      .select("configuration, status, product_id, discount_percentage, products(stock_recipe)")
      .eq("id", quoteId)
      .single();

    if (fetchErr) throw fetchErr;

    // pending_admin_approval statüsünde ise normal accept/reject yapılamaz
    if (quote.status === "pending_admin_approval" && status === "accepted") {
      return {
        success: false,
        error: "Bu teklifin iskonto onayı henüz verilmemiş. Önce iskontoyu onaylayın.",
      };
    }

    // Durumu güncelle
    const { error } = await supabase
      .from("quotes")
      .update({ status, is_read_by_sales: false })
      .eq("id", quoteId);

    if (error) throw error;

    // ===========================================================
    // Stok işlemleri için envanter kalemlerini topla
    // 1. Öncelik: configuration array'indeki inventory_id alanları (varyant bazlı)
    // 2. Yedek: product.stock_recipe (ürün bazlı malzeme reçetesi)
    // ===========================================================
    type StockEntry = { invId: string; amount: number };
    const stockEntries: StockEntry[] = [];

    // Kaynak 1: Configuration array
    const config = quote.configuration;
    if (Array.isArray(config)) {
      for (const item of config) {
        if (item.inventory_id && Number(item.required_amount) > 0) {
          stockEntries.push({
            invId: item.inventory_id,
            amount: Number(item.required_amount),
          });
        }
      }
    }

    // Kaynak 2: Product stock_recipe (configuration'da stok bilgisi yoksa)
    if (stockEntries.length === 0) {
      const product = quote.products as any;
      const recipe = product?.stock_recipe;
      if (Array.isArray(recipe)) {
        for (const item of recipe) {
          if (item.inventory_id && Number(item.amount) > 0) {
            stockEntries.push({
              invId: item.inventory_id,
              amount: Number(item.amount),
            });
          }
        }
      }
    }

    // Stok işlemlerini uygula
    if (stockEntries.length > 0) {
      if (status === "accepted" && quote.status === "pending") {
        // Teklif onaylandı → Stok düş + Rezervasyonu temizle
        for (const entry of stockEntries) {
          const { data: inv } = await supabase
            .from("inventory")
            .select("stock_level, reserved_stock")
            .eq("id", entry.invId)
            .single();

          if (inv) {
            await supabase
              .from("inventory")
              .update({
                stock_level: Math.max(
                  Number(inv.stock_level) - entry.amount,
                  0,
                ),
                reserved_stock: Math.max(
                  Number(inv.reserved_stock) - entry.amount,
                  0,
                ),
              })
              .eq("id", entry.invId);
          }
        }
      }

      if (status === "rejected" && quote.status === "pending") {
        // Teklif reddedildi → Sadece rezervasyonu geri iade et
        for (const entry of stockEntries) {
          const { data: inv } = await supabase
            .from("inventory")
            .select("reserved_stock")
            .eq("id", entry.invId)
            .single();

          if (inv) {
            await supabase
              .from("inventory")
              .update({
                reserved_stock: Math.max(
                  Number(inv.reserved_stock) - entry.amount,
                  0,
                ),
              })
              .eq("id", entry.invId);
          }
        }
      }
    }

    revalidatePath("/sales/quotes");
    revalidatePath(`/sales/quotes/${quoteId}`);
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error: any) {
    console.error("Status Update Failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Admin tarafından iskonto onayı veya reddi.
 * Onay: pending_admin_approval → pending (Normal akışa girer)
 * Red: pending_admin_approval → rejected
 */
export async function approveDiscountAction(
  quoteId: string,
  action: "approve" | "reject",
) {
  try {
    const supabase = await createClient();

    // Admin kontrolü
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Oturum bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return { success: false, error: "Bu işlem için admin yetkisi gereklidir." };
    }

    // Teklifi kontrol et
    const { data: quote, error: fetchErr } = await supabase
      .from("quotes")
      .select("status")
      .eq("id", quoteId)
      .single();

    if (fetchErr) throw fetchErr;

    if (quote.status !== "pending_admin_approval") {
      return {
        success: false,
        error: "Bu teklif iskonto onayı bekliyor durumda değil.",
      };
    }

    const newStatus = action === "approve" ? "pending" : "rejected";

    const { error } = await supabase
      .from("quotes")
      .update({ 
        status: newStatus,
        is_read_by_sales: false 
      })
      .eq("id", quoteId);

    if (error) throw error;

    revalidatePath("/sales/quotes");
    revalidatePath(`/sales/quotes/${quoteId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Discount Approval Failed:", error);
    return { success: false, error: error.message };
  }
}

export async function markQuotesAsReadAction(role: "admin" | "sales", quoteId?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    if (role === "admin") {
      const query = supabase.from("quotes").update({ is_read_by_admin: true }).eq("is_read_by_admin", false);
      if (quoteId) query.eq("id", quoteId);
      await query;
    } else {
      const query = supabase.from("quotes").update({ is_read_by_sales: true }).eq("created_by", user.id).eq("is_read_by_sales", false);
      if (quoteId) query.eq("id", quoteId);
      await query;
    }
    
    revalidatePath("/sales/quotes");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
