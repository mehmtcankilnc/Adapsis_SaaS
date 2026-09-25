"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils";
import { getCurrentProfile } from "@/lib/auth";

/**
 * Satış personeli tarafından ürün veya envanter güncelleme talebi oluşturur.
 */
export async function createSystemRequestAction(data: {
  request_type: "product" | "inventory";
  item_id: string;
  item_name: string;
  request_note: string;
}) {
  try {
    const supabase = await createClient();
    const profile = await getCurrentProfile();

    if (!profile) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    if (!data.request_note || data.request_note.trim().length < 5) {
      return {
        success: false,
        error: "Lütfen en az 5 karakter uzunluğunda bir açıklama yazın.",
      };
    }

    const { error } = await supabase.from("system_requests").insert({
      request_type: data.request_type,
      item_id: data.item_id,
      item_name: data.item_name,
      requested_by: profile.user.id,
      organization_id: profile.organizationId,
      request_note: data.request_note.trim(),
      status: "pending",
    });

    if (error) {
      console.error("Talep oluşturma hatası:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/requests");
    return { success: true };
  } catch (error: unknown) {
    console.error("Request Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Admin tarafından gelen talepleri onayla veya reddet.
 */
export async function updateSystemRequestAction(
  requestId: string,
  status: "approved" | "rejected",
  adminResponse?: string,
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
      return { success: false, error: "Yetkiniz bulunmuyor." };
    }

    const updateData: { status: "approved" | "rejected"; updated_at: string; admin_response?: string } = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (adminResponse && adminResponse.trim()) {
      updateData.admin_response = adminResponse.trim();
    }

    const { error } = await supabase
      .from("system_requests")
      .update(updateData)
      .eq("id", requestId);

    if (error) {
      console.error("Talep güncelleme hatası:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/requests");
    return { success: true };
  } catch (error: unknown) {
    console.error("Request Update Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
