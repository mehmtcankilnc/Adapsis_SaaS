"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";

function getCurrentPeriodMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Giriş Yapan Temsilcinin Kendi Kota/Komisyon Bilgisi ───
export async function getMyQuotaAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Oturum bulunamadı." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("commission_rate")
      .eq("id", user.id)
      .single();

    const { data: target } = await supabase
      .from("sales_targets")
      .select("target_amount, target_currency")
      .eq("profile_id", user.id)
      .eq("period_month", getCurrentPeriodMonth())
      .maybeSingle();

    return {
      success: true,
      commissionRate: profile?.commission_rate || 0,
      targetAmount: target?.target_amount || 0,
      targetCurrency: target?.target_currency || "USD",
    };
  } catch (error: unknown) {
    console.error("getMyQuotaAction hatası:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// ─── Admin: Tüm Temsilcilerin Kota/Komisyon Durumu ───
export async function listRepsQuotaAction() {
  try {
    const { organizationId } = await assertAdmin();
    const admin = createAdminClient();
    const periodMonth = getCurrentPeriodMonth();

    const { data: profiles, error: profilesErr } = await admin
      .from("profiles")
      .select("id, full_name, commission_rate")
      .eq("organization_id", organizationId)
      .eq("role", "sales")
      .order("full_name", { ascending: true });
    if (profilesErr) throw profilesErr;

    const repIds = (profiles || []).map((p) => p.id);

    const { data: targets } = await admin
      .from("sales_targets")
      .select("profile_id, target_amount, target_currency")
      .eq("organization_id", organizationId)
      .eq("period_month", periodMonth)
      .in("profile_id", repIds.length > 0 ? repIds : ["00000000-0000-0000-0000-000000000000"]);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: acceptedQuotes } = await admin
      .from("quotes")
      .select("final_price, currency, created_by")
      .eq("organization_id", organizationId)
      .eq("status", "accepted")
      .gte("accepted_at", monthStart.toISOString())
      .in("created_by", repIds.length > 0 ? repIds : ["00000000-0000-0000-0000-000000000000"]);

    const targetMap = new Map((targets || []).map((t) => [t.profile_id, t]));
    const quotesByRep = new Map<string, { final_price: number; currency: string }[]>();
    (acceptedQuotes || []).forEach((q) => {
      if (!q.created_by) return;
      const list = quotesByRep.get(q.created_by) || [];
      list.push({ final_price: Number(q.final_price), currency: q.currency });
      quotesByRep.set(q.created_by, list);
    });

    const reps = (profiles || []).map((p) => {
      const target = targetMap.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name || "İsimsiz",
        commissionRate: p.commission_rate || 0,
        targetAmount: target?.target_amount || 0,
        targetCurrency: target?.target_currency || "USD",
        acceptedQuotes: quotesByRep.get(p.id) || [],
      };
    });

    return { success: true, reps };
  } catch (error: unknown) {
    console.error("listRepsQuotaAction hatası:", error);
    return { success: false, error: getErrorMessage(error), reps: [] };
  }
}

// ─── Admin: Temsilci Kota/Komisyon Güncelleme ───
export async function upsertRepQuotaAction(
  profileId: string,
  data: { commissionRate?: number; targetAmount?: number; targetCurrency?: string },
) {
  try {
    const { organizationId } = await assertAdmin();
    const admin = createAdminClient();

    if (data.commissionRate !== undefined) {
      const { error } = await admin
        .from("profiles")
        .update({ commission_rate: data.commissionRate })
        .eq("id", profileId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    }

    if (data.targetAmount !== undefined || data.targetCurrency !== undefined) {
      const { error } = await admin.from("sales_targets").upsert(
        {
          profile_id: profileId,
          organization_id: organizationId,
          period_month: getCurrentPeriodMonth(),
          target_amount: data.targetAmount ?? 0,
          target_currency: data.targetCurrency || "USD",
        },
        { onConflict: "profile_id,period_month" },
      );
      if (error) throw error;
    }

    revalidatePath("/admin/settings");
    revalidatePath("/sales/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("upsertRepQuotaAction hatası:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
