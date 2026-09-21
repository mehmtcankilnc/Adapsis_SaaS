"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils";
import type { CustomerStatus } from "@/types/product.types";

export async function createCustomerAction(data: {
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    if (!data.company_name || data.company_name.trim() === "") {
      return { success: false, error: "Firma adı zorunludur." };
    }

    const { data: newCustomer, error } = await supabase
      .from("customers")
      .insert({
        company_name: data.company_name,
        contact_name: data.contact_name || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        created_by: user.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Müşteri Kayıt Hatası:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/shared/customers");
    return { success: true, customer: newCustomer };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateCustomerAction(
  customerId: string,
  data: {
    company_name?: string;
    contact_name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    status?: CustomerStatus;
    owner_id?: string | null;
    industry?: string | null;
    source?: string | null;
    tags?: string[];
    notes?: string | null;
  },
) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    if (data.company_name !== undefined && data.company_name.trim() === "") {
      return { success: false, error: "Firma adı boş bırakılamaz." };
    }

    // RLS zaten sahiplik dışı güncellemeleri engeller (bkz. migration 020/022);
    // burada sadece anlamlı bir hata mesajı üretmek için update sonrası satır
    // döndü mü kontrol ediyoruz.
    const { data: updated, error } = await supabase
      .from("customers")
      .update(data)
      .eq("id", customerId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Müşteri Güncelleme Hatası:", error);
      return { success: false, error: error.message };
    }

    if (!updated) {
      return {
        success: false,
        error: "Bu müşteriyi güncelleme yetkiniz yok veya müşteri bulunamadı.",
      };
    }

    revalidatePath("/shared/customers");
    revalidatePath(`/shared/customers/${customerId}`);
    return { success: true, customer: updated };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getContactsByCustomerAction(customerId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("customer_id", customerId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw error;

    return { success: true, contacts: data };
  } catch (error: unknown) {
    console.error("Kişi Listeleme Hatası:", error);
    return { success: false, error: getErrorMessage(error), contacts: [] };
  }
}

export async function createContactAction(data: {
  customer_id: string;
  full_name: string;
  title?: string;
  email?: string;
  phone?: string;
  is_primary?: boolean;
  notes?: string;
}) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    if (!data.full_name || data.full_name.trim() === "") {
      return { success: false, error: "Kişi adı zorunludur." };
    }
    if (!data.customer_id) {
      return { success: false, error: "Müşteri seçimi zorunludur." };
    }

    // Aynı müşteride yalnızca bir "birincil" kişi olabilir (unique index,
    // bkz. migration 021). Yeni kişi birincil olarak işaretleniyorsa önce
    // mevcut birincili indir.
    if (data.is_primary) {
      await supabase
        .from("contacts")
        .update({ is_primary: false })
        .eq("customer_id", data.customer_id)
        .eq("is_primary", true);
    }

    const { data: newContact, error } = await supabase
      .from("contacts")
      .insert({
        customer_id: data.customer_id,
        full_name: data.full_name,
        title: data.title || null,
        email: data.email || null,
        phone: data.phone || null,
        is_primary: data.is_primary ?? false,
        notes: data.notes || null,
        created_by: user.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Kişi Kayıt Hatası:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/shared/customers");
    revalidatePath(`/shared/customers/${data.customer_id}`);
    return { success: true, contact: newContact };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateContactAction(
  contactId: string,
  data: {
    full_name?: string;
    title?: string | null;
    email?: string | null;
    phone?: string | null;
    is_primary?: boolean;
    notes?: string | null;
  },
) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    if (data.full_name !== undefined && data.full_name.trim() === "") {
      return { success: false, error: "Kişi adı boş bırakılamaz." };
    }

    const { data: existing, error: fetchErr } = await supabase
      .from("contacts")
      .select("customer_id")
      .eq("id", contactId)
      .single();

    if (fetchErr) {
      return { success: false, error: "Kişi bulunamadı." };
    }

    if (data.is_primary) {
      await supabase
        .from("contacts")
        .update({ is_primary: false })
        .eq("customer_id", existing.customer_id)
        .eq("is_primary", true)
        .neq("id", contactId);
    }

    const { data: updated, error } = await supabase
      .from("contacts")
      .update(data)
      .eq("id", contactId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Kişi Güncelleme Hatası:", error);
      return { success: false, error: error.message };
    }

    if (!updated) {
      return {
        success: false,
        error: "Bu kişiyi güncelleme yetkiniz yok veya kişi bulunamadı.",
      };
    }

    revalidatePath("/shared/customers");
    revalidatePath(`/shared/customers/${existing.customer_id}`);
    return { success: true, contact: updated };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteContactAction(contactId: string) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const { data: existing } = await supabase
      .from("contacts")
      .select("customer_id")
      .eq("id", contactId)
      .single();

    const { error, count } = await supabase
      .from("contacts")
      .delete({ count: "exact" })
      .eq("id", contactId);

    if (error) {
      console.error("Kişi Silme Hatası:", error);
      return { success: false, error: error.message };
    }

    if (!count) {
      return {
        success: false,
        error: "Bu kişiyi silme yetkiniz yok veya kişi bulunamadı.",
      };
    }

    revalidatePath("/shared/customers");
    if (existing?.customer_id) {
      revalidatePath(`/shared/customers/${existing.customer_id}`);
    }
    return { success: true };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
