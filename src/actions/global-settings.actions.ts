"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils";

export async function updateGlobalSettingsAction(data: {
  company_name: string;
  company_address: string;
  iban: string;
  tax_rate: number;
  default_margin: number;
  quote_footer_text: string;
  discount_approval_threshold: number;
  quote_followup_days: number;
}) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.user.id)
      .single();

    if (profile?.role !== "admin") {
      return { success: false, error: "Admin yetkisi gereklidir." };
    }

    const { data: existing } = await supabase.from("global_settings").select("id").limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from("global_settings")
        .update({
          company_name: data.company_name,
          company_address: data.company_address,
          iban: data.iban,
          tax_rate: data.tax_rate,
          default_margin: data.default_margin,
          quote_footer_text: data.quote_footer_text,
          discount_approval_threshold: data.discount_approval_threshold,
          quote_followup_days: data.quote_followup_days,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing[0].id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("global_settings").insert({
        company_name: data.company_name,
        company_address: data.company_address,
        iban: data.iban,
        tax_rate: data.tax_rate,
        default_margin: data.default_margin,
        quote_footer_text: data.quote_footer_text,
        discount_approval_threshold: data.discount_approval_threshold,
        quote_followup_days: data.quote_followup_days,
      });

      if (error) throw error;
    }

    revalidatePath("/admin/settings");
    revalidatePath("/sales/quotes");
    return { success: true };
  } catch (error: unknown) {
    console.error("Settings Update Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
