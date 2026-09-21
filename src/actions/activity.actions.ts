"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils";
import type { ActivityType } from "@/types/product.types";

export async function getActivitiesByCustomerAction(customerId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("customer_id", customerId)
      .order("activity_date", { ascending: false });

    if (error) throw error;

    return { success: true, activities: data };
  } catch (error: unknown) {
    console.error("Aktivite Listeleme Hatası:", error);
    return { success: false, error: getErrorMessage(error), activities: [] };
  }
}

export async function createActivityAction(data: {
  customer_id: string;
  type: ActivityType;
  subject: string;
  notes?: string;
  activity_date?: string;
  quote_id?: string;
}) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    if (!data.subject || data.subject.trim() === "") {
      return { success: false, error: "Konu zorunludur." };
    }
    if (!data.customer_id) {
      return { success: false, error: "Müşteri seçimi zorunludur." };
    }

    const { data: newActivity, error } = await supabase
      .from("activities")
      .insert({
        customer_id: data.customer_id,
        quote_id: data.quote_id || null,
        type: data.type,
        subject: data.subject,
        notes: data.notes || null,
        activity_date: data.activity_date || new Date().toISOString(),
        created_by: user.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Aktivite Kayıt Hatası:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/shared/customers/${data.customer_id}`);
    return { success: true, activity: newActivity };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateActivityAction(
  activityId: string,
  data: {
    type?: ActivityType;
    subject?: string;
    notes?: string | null;
    activity_date?: string;
  },
) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    if (data.subject !== undefined && data.subject.trim() === "") {
      return { success: false, error: "Konu boş bırakılamaz." };
    }

    const { data: updated, error } = await supabase
      .from("activities")
      .update(data)
      .eq("id", activityId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Aktivite Güncelleme Hatası:", error);
      return { success: false, error: error.message };
    }

    if (!updated) {
      return {
        success: false,
        error: "Bu aktiviteyi güncelleme yetkiniz yok veya aktivite bulunamadı.",
      };
    }

    revalidatePath(`/shared/customers/${updated.customer_id}`);
    return { success: true, activity: updated };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteActivityAction(activityId: string) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const { data: existing } = await supabase
      .from("activities")
      .select("customer_id")
      .eq("id", activityId)
      .single();

    const { error, count } = await supabase
      .from("activities")
      .delete({ count: "exact" })
      .eq("id", activityId);

    if (error) {
      console.error("Aktivite Silme Hatası:", error);
      return { success: false, error: error.message };
    }

    if (!count) {
      return {
        success: false,
        error: "Bu aktiviteyi silme yetkiniz yok veya aktivite bulunamadı.",
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
