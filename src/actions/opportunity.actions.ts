"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils";
import type { OpportunityStage } from "@/types/product.types";

export async function getOpportunitiesByCustomerAction(customerId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, opportunities: data };
  } catch (error: unknown) {
    console.error("Fırsat Listeleme Hatası:", error);
    return { success: false, error: getErrorMessage(error), opportunities: [] };
  }
}

export async function createOpportunityAction(data: {
  customer_id: string;
  title: string;
  stage?: OpportunityStage;
  estimated_value?: number;
  currency?: string;
  probability?: number;
  expected_close_date?: string;
  owner_id?: string;
  quote_id?: string;
  lost_reason?: string;
  competitor?: string;
}) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    if (!data.title || data.title.trim() === "") {
      return { success: false, error: "Fırsat başlığı zorunludur." };
    }
    if (!data.customer_id) {
      return { success: false, error: "Müşteri seçimi zorunludur." };
    }

    const stage = data.stage || "lead";

    const { data: newOpportunity, error } = await supabase
      .from("opportunities")
      .insert({
        customer_id: data.customer_id,
        quote_id: data.quote_id || null,
        title: data.title,
        stage,
        estimated_value: data.estimated_value ?? null,
        currency: data.currency || "USD",
        probability: data.probability ?? null,
        expected_close_date: data.expected_close_date || null,
        owner_id: data.owner_id || null,
        lost_reason: stage === "lost" ? (data.lost_reason || null) : null,
        competitor: stage === "lost" ? (data.competitor || null) : null,
        // updateOpportunityAction'daki mantıkla tutarlı: fırsat doğrudan
        // won/lost aşamasıyla oluşturulursa kapanış tarihi de o an atanır.
        closed_at: stage === "won" || stage === "lost" ? new Date().toISOString() : null,
        created_by: user.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Fırsat Kayıt Hatası:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/shared/customers/${data.customer_id}`);
    return { success: true, opportunity: newOpportunity };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateOpportunityAction(
  opportunityId: string,
  data: {
    title?: string;
    stage?: OpportunityStage;
    estimated_value?: number | null;
    currency?: string;
    probability?: number | null;
    expected_close_date?: string | null;
    owner_id?: string | null;
    lost_reason?: string | null;
    competitor?: string | null;
  },
) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    if (data.title !== undefined && data.title.trim() === "") {
      return { success: false, error: "Fırsat başlığı boş bırakılamaz." };
    }

    const payload: typeof data & { closed_at?: string | null } = { ...data };
    if (data.stage === "won" || data.stage === "lost") {
      payload.closed_at = new Date().toISOString();
    } else if (data.stage) {
      // Kapanmış bir fırsat yeniden açık bir aşamaya (lead/qualified/proposal/
      // negotiation) taşınırsa kapanış tarihi de sıfırlanmalı.
      payload.closed_at = null;
    }

    const { data: updated, error } = await supabase
      .from("opportunities")
      .update(payload)
      .eq("id", opportunityId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Fırsat Güncelleme Hatası:", error);
      return { success: false, error: error.message };
    }

    if (!updated) {
      return {
        success: false,
        error: "Bu fırsatı güncelleme yetkiniz yok veya fırsat bulunamadı.",
      };
    }

    revalidatePath(`/shared/customers/${updated.customer_id}`);
    return { success: true, opportunity: updated };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteOpportunityAction(opportunityId: string) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const { data: existing } = await supabase
      .from("opportunities")
      .select("customer_id")
      .eq("id", opportunityId)
      .single();

    const { error, count } = await supabase
      .from("opportunities")
      .delete({ count: "exact" })
      .eq("id", opportunityId);

    if (error) {
      console.error("Fırsat Silme Hatası:", error);
      return { success: false, error: error.message };
    }

    if (!count) {
      return {
        success: false,
        error: "Bu fırsatı silme yetkiniz yok veya fırsat bulunamadı.",
      };
    }

    if (existing?.customer_id) {
      revalidatePath(`/shared/customers/${existing.customer_id}`);
    }
    return { success: true };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
