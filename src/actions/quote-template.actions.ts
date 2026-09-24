"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils";
import { normalizeConfigurationToArray } from "@/lib/quote-config";
import type { ProductVariant } from "@/types/product.types";

export async function getTemplatesByProductAction(productId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("quote_templates")
      .select("id, name, configuration, created_by")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, templates: data };
  } catch (error: unknown) {
    console.error("Şablon Listeleme Hatası:", error);
    return { success: false, error: getErrorMessage(error), templates: [] };
  }
}

export async function createTemplateAction(data: {
  product_id: string;
  name: string;
  configuration: Record<string, string>;
  variants?: Pick<ProductVariant, "id" | "options">[];
}) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Şablon adı zorunludur." };
    }
    if (!data.product_id) {
      return { success: false, error: "Ürün seçimi zorunludur." };
    }

    const configArray = normalizeConfigurationToArray(data.configuration, data.variants);

    const { data: newTemplate, error } = await supabase
      .from("quote_templates")
      .insert({
        product_id: data.product_id,
        name: data.name.trim(),
        configuration: configArray,
        created_by: user.id,
      })
      .select("id, name, configuration, created_by")
      .single();

    if (error) {
      console.error("Şablon Kayıt Hatası:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/sales/configurator/${data.product_id}`);
    return { success: true, template: newTemplate };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteTemplateAction(templateId: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const { data: existing } = await supabase
      .from("quote_templates")
      .select("product_id")
      .eq("id", templateId)
      .single();

    const { error, count } = await supabase
      .from("quote_templates")
      .delete({ count: "exact" })
      .eq("id", templateId);

    if (error) {
      console.error("Şablon Silme Hatası:", error);
      return { success: false, error: error.message };
    }

    if (!count) {
      return {
        success: false,
        error: "Bu şablonu silme yetkiniz yok veya şablon bulunamadı.",
      };
    }

    if (existing?.product_id) {
      revalidatePath(`/sales/configurator/${existing.product_id}`);
    }
    return { success: true };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
