"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils";
import { getCurrentProfile } from "@/lib/auth";
import type { TaskStatus } from "@/types/product.types";

export async function getTasksByCustomerAction(customerId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("customer_id", customerId)
      .order("due_date", { ascending: true });

    if (error) throw error;

    return { success: true, tasks: data };
  } catch (error: unknown) {
    console.error("Görev Listeleme Hatası:", error);
    return { success: false, error: getErrorMessage(error), tasks: [] };
  }
}

export async function createTaskAction(data: {
  customer_id: string;
  title: string;
  description?: string;
  due_date?: string;
  assigned_to?: string;
  quote_id?: string;
}) {
  try {
    const supabase = await createClient();

    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    if (!data.title || data.title.trim() === "") {
      return { success: false, error: "Görev başlığı zorunludur." };
    }
    if (!data.customer_id) {
      return { success: false, error: "Müşteri seçimi zorunludur." };
    }

    const { data: newTask, error } = await supabase
      .from("tasks")
      .insert({
        customer_id: data.customer_id,
        quote_id: data.quote_id || null,
        title: data.title,
        description: data.description || null,
        due_date: data.due_date || new Date().toISOString(),
        assigned_to: data.assigned_to || null,
        created_by: profile.user.id,
        organization_id: profile.organizationId,
      })
      .select()
      .single();

    if (error) {
      console.error("Görev Kayıt Hatası:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/shared/customers/${data.customer_id}`);
    return { success: true, task: newTask };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateTaskAction(
  taskId: string,
  data: {
    title?: string;
    description?: string | null;
    due_date?: string;
    assigned_to?: string | null;
    status?: TaskStatus;
  },
) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    if (data.title !== undefined && data.title.trim() === "") {
      return { success: false, error: "Görev başlığı boş bırakılamaz." };
    }

    const payload: typeof data & { completed_at?: string | null } = { ...data };
    if (data.status === "completed") {
      payload.completed_at = new Date().toISOString();
    } else if (data.status === "pending" || data.status === "cancelled") {
      payload.completed_at = null;
    }

    const { data: updated, error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", taskId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Görev Güncelleme Hatası:", error);
      return { success: false, error: error.message };
    }

    if (!updated) {
      return {
        success: false,
        error: "Bu görevi güncelleme yetkiniz yok veya görev bulunamadı.",
      };
    }

    revalidatePath(`/shared/customers/${updated.customer_id}`);
    return { success: true, task: updated };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteTaskAction(taskId: string) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const { data: existing } = await supabase
      .from("tasks")
      .select("customer_id")
      .eq("id", taskId)
      .single();

    const { error, count } = await supabase
      .from("tasks")
      .delete({ count: "exact" })
      .eq("id", taskId);

    if (error) {
      console.error("Görev Silme Hatası:", error);
      return { success: false, error: error.message };
    }

    if (!count) {
      return {
        success: false,
        error: "Bu görevi silme yetkiniz yok veya görev bulunamadı.",
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
