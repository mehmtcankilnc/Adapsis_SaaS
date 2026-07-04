"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  } catch (error: any) {
    console.error("Action Failed:", error);
    return { success: false, error: error.message };
  }
}
