"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";
import type { Opportunity } from "@/types/product.types";

function getCurrentPeriodMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Admin: Satış Hattı & Gelir Tahmini için Tüm Veri ───
export async function getPipelineAnalyticsAction() {
  try {
    const { organizationId } = await assertAdmin();
    const admin = createAdminClient();

    const { data: opportunitiesRaw, error: oppErr } = await admin
      .from("opportunities")
      .select("id, customer_id, title, stage, estimated_value, currency, probability, expected_close_date, owner_id, closed_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (oppErr) throw oppErr;

    // İsimleri ayrı sorgularla çekip client-side (burada) map'liyoruz —
    // PostgREST FK-embed söz dizimini varsaymak yerine, kod tabanında zaten
    // kullanılan (bkz. CustomerDetailClient.tsx, listRepsQuotaAction) güvenli desen.
    const customerIds = [...new Set((opportunitiesRaw || []).map((o) => o.customer_id).filter(Boolean))] as string[];
    const ownerIds = [...new Set((opportunitiesRaw || []).map((o) => o.owner_id).filter(Boolean))] as string[];

    const [{ data: customers }, { data: profiles }] = await Promise.all([
      customerIds.length > 0
        ? admin.from("customers").select("id, company_name").eq("organization_id", organizationId).in("id", customerIds)
        : Promise.resolve({ data: [] as { id: string; company_name: string }[] }),
      ownerIds.length > 0
        ? admin.from("profiles").select("id, full_name").eq("organization_id", organizationId).in("id", ownerIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    ]);

    const customerMap = new Map((customers || []).map((c) => [c.id, c.company_name]));
    const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name || "Bilinmeyen"]));

    const opportunities: Opportunity[] = (opportunitiesRaw || []).map((o) => ({
      ...o,
      customer_company_name: o.customer_id ? customerMap.get(o.customer_id) : undefined,
      owner_name: o.owner_id ? profileMap.get(o.owner_id) : undefined,
    })) as Opportunity[];

    const periodMonth = getCurrentPeriodMonth();
    const { data: targets, error: targetsErr } = await admin
      .from("sales_targets")
      .select("profile_id, target_amount, target_currency")
      .eq("organization_id", organizationId)
      .eq("period_month", periodMonth);
    if (targetsErr) throw targetsErr;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { data: acceptedQuotes, error: quotesErr } = await admin
      .from("quotes")
      .select("final_price, currency")
      .eq("organization_id", organizationId)
      .eq("status", "accepted")
      .gte("accepted_at", monthStart.toISOString());
    if (quotesErr) throw quotesErr;

    return {
      success: true,
      opportunities,
      targets: targets || [],
      acceptedQuotes: acceptedQuotes || [],
    };
  } catch (error: unknown) {
    console.error("getPipelineAnalyticsAction hatası:", error);
    return {
      success: false,
      error: getErrorMessage(error),
      opportunities: [] as Opportunity[],
      targets: [] as { profile_id: string; target_amount: number; target_currency: string }[],
      acceptedQuotes: [] as { final_price: number; currency: string }[],
    };
  }
}
