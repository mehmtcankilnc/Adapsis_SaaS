"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getErrorMessage } from "@/lib/utils";
import type { ProductVariant, QuoteConfigurationItem, QuoteStatus } from "@/types/product.types";
import { ensureQuoteFollowUpTask } from "@/actions/quote-followup.actions";
import { normalizeConfigurationToArray } from "@/lib/quote-config";
import { getCurrentProfile } from "@/lib/auth";

interface StockCheckItem {
  inventory_id: string;
  required_amount: number;
}

export async function createQuoteAction(data: {
  product_id: string;
  customer_id: string;
  customer_contact?: string;
  configuration: Record<string, string> | QuoteConfigurationItem[];
  base_price_snapshot: number;
  final_price: number;
  currency: string;
  variants?: Pick<ProductVariant, "id" | "options">[];
  discount_percentage?: number;
}) {
  let isSuccess = false;
  let errorMsg: string | null = null;

  try {
    const supabase = await createClient();

    const profile = await getCurrentProfile();

    if (!profile) {
      return { success: false, error: "Oturum bulunamadı." };
    }
    const { user, organizationId } = profile;

    if (!data.customer_id) {
      return { success: false, error: "Müşteri seçimi zorunludur." };
    }

    // JSONB uyumluluğu: Configuration objesini array formatına çevir
    const configArray = Array.isArray(data.configuration)
      ? data.configuration
      : normalizeConfigurationToArray(data.configuration, data.variants);

    // Stok doğrulaması: İstemci tarafı kontrolü atlanabileceğinden (örn.
    // network isteği elle tetiklenirse), stokta yeterli miktar olup
    // olmadığını burada da doğrula. Aksi halde satış temsilcisi stokta
    // olmayan bir kalemi müşteriye teklif edebilir.
    // Kaynak önceliği DB trigger'ıyla (bkz. migration 018) aynı olmalı:
    // önce configuration (varyant bazlı inventory_id), o yoksa ürünün
    // Malzeme Reçetesi (stock_recipe) — sistemdeki gerçek ürünlerin tamamı
    // ikinci yöntemi kullanıyor.
    let stockChecks: StockCheckItem[] = configArray
      .filter((item) => item.inventory_id && Number(item.required_amount) > 0)
      .map((item) => ({
        inventory_id: item.inventory_id as string,
        required_amount: Number(item.required_amount),
      }));
    if (stockChecks.length === 0) {
      const { data: productRow } = await supabase
        .from("products")
        .select("stock_recipe")
        .eq("id", data.product_id)
        .single();
      const recipe = productRow?.stock_recipe;
      if (Array.isArray(recipe)) {
        stockChecks = recipe
          .filter((item) => item.inventory_id && Number(item.amount) > 0)
          .map((item) => ({
            inventory_id: item.inventory_id,
            required_amount: Number(item.amount),
          }));
      }
    }
    if (stockChecks.length > 0) {
      const invIds = [...new Set(stockChecks.map((i) => i.inventory_id))];
      const { data: invRows } = await supabase
        .from("inventory")
        .select("id, item_name, stock_level, reserved_stock")
        .in("id", invIds);

      for (const item of stockChecks) {
        const inv = invRows?.find((r) => r.id === item.inventory_id);
        if (!inv) continue;
        const available = Number(inv.stock_level) - Number(inv.reserved_stock || 0);
        if (available < Number(item.required_amount)) {
          return {
            success: false,
            error: `"${inv.item_name}" için stok yetersiz (Kullanılabilir: ${Math.max(available, 0)}, Gerekli: ${item.required_amount}).`,
          };
        }
      }
    }

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

    // İskonto onay eşiği admin tarafından Ayarlar sayfasından yapılandırılabilir
    // (bkz. global_settings.discount_approval_threshold); satır bulunamazsa %5
    // varsayılana düşülür.
    const { data: settingsRow } = await supabase
      .from("global_settings")
      .select("discount_approval_threshold")
      .eq("organization_id", organizationId)
      .maybeSingle();
    const discountThreshold = Number(settingsRow?.discount_approval_threshold ?? 5);

    let quoteStatus: QuoteStatus = "pending";
    if (discountPct > discountThreshold) {
      quoteStatus = "pending_admin_approval";
    }

    const { data: newQuote, error } = await supabase
      .from("quotes")
      .insert({
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
        organization_id: organizationId,
        is_read_by_admin: false,
        is_read_by_sales: true,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Teklif Kayıt Hatası:", error);
      errorMsg = error.message;
    } else {
      isSuccess = true;

      // Teklif doğrudan müşteriye gönderilmiş (pending) durumdaysa otomatik
      // takip görevi oluştur. pending_admin_approval'da henüz gönderilmedi,
      // görev onay sonrası approveDiscountAction içinde oluşturulur. Bu bir
      // yardımcı işlemdir; hata teklif oluşturma akışını bozmamalı.
      if (quoteStatus === "pending" && newQuote?.id) {
        try {
          await ensureQuoteFollowUpTask(newQuote.id);
        } catch (followUpError) {
          console.error("Takip Görevi Oluşturma Hatası:", followUpError);
        }
      }
    }
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    errorMsg = getErrorMessage(error);
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

    const { data: quote, error: fetchErr } = await supabase
      .from("quotes")
      .select("status")
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

    // Durumu güncelle. Stok düşme / rezervasyon iade işlemleri artık tamamen
    // veritabanı trigger'ı (trg_quote_stock_reservation, bkz. migration 016)
    // tarafından, bu UPDATE ile aynı transaction içinde atomik olarak
    // yürütülür. Burada tekrar elle stok güncellemesi YAPILMAZ — aksi halde
    // rezervasyon iki kez düşülür (bkz. migration 016 açıklaması).
    const updatePayload: { status: "accepted" | "rejected"; is_read_by_sales: boolean; accepted_at?: string } = {
      status,
      is_read_by_sales: false,
    };
    if (status === "accepted") {
      updatePayload.accepted_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("quotes")
      .update(updatePayload)
      .eq("id", quoteId);

    if (error) throw error;

    revalidatePath("/sales/quotes");
    revalidatePath(`/sales/quotes/${quoteId}`);
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error: unknown) {
    console.error("Status Update Failed:", error);
    return { success: false, error: getErrorMessage(error) };
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

    // Onaylanan teklif artık müşteriye gönderilmiş (pending) sayılır —
    // otomatik takip görevi oluştur. Reddedilen teklifler için gerekmez.
    if (newStatus === "pending") {
      try {
        await ensureQuoteFollowUpTask(quoteId);
      } catch (followUpError) {
        console.error("Takip Görevi Oluşturma Hatası:", followUpError);
      }
    }

    revalidatePath("/sales/quotes");
    revalidatePath(`/sales/quotes/${quoteId}`);
    return { success: true };
  } catch (error: unknown) {
    console.error("Discount Approval Failed:", error);
    return { success: false, error: getErrorMessage(error) };
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
  } catch {
    return { success: false };
  }
}
