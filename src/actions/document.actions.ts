"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils";

const BUCKET = "customer-documents";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function getDocumentsByCustomerAction(customerId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, documents: data };
  } catch (error: unknown) {
    console.error("Doküman Listeleme Hatası:", error);
    return { success: false, error: getErrorMessage(error), documents: [] };
  }
}

export async function uploadDocumentAction(formData: FormData) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const customerId = formData.get("customer_id") as string | null;
    const file = formData.get("file") as File | null;

    if (!customerId) {
      return { success: false, error: "Müşteri seçimi zorunludur." };
    }
    if (!file || file.size === 0) {
      return { success: false, error: "Bir dosya seçin." };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { success: false, error: "Dosya boyutu 20 MB sınırını aşıyor." };
    }

    const storagePath = `${customerId}/${crypto.randomUUID()}_${sanitizeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type || undefined });

    if (uploadError) {
      console.error("Dosya Yükleme Hatası:", uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: newDocument, error: insertError } = await supabase
      .from("documents")
      .insert({
        customer_id: customerId,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type || null,
        uploaded_by: user.user.id,
      })
      .select()
      .single();

    if (insertError) {
      // Metadata kaydı başarısız olursa, storage'da yetim (orphan) dosya
      // bırakmamak için yüklenen dosyayı geri al.
      await supabase.storage.from(BUCKET).remove([storagePath]);
      console.error("Doküman Metadata Kayıt Hatası:", insertError);
      return { success: false, error: insertError.message };
    }

    revalidatePath(`/shared/customers/${customerId}`);
    return { success: true, document: newDocument };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getDocumentDownloadUrlAction(documentId: string) {
  try {
    const supabase = await createClient();

    const { data: doc, error: fetchErr } = await supabase
      .from("documents")
      .select("storage_path, file_name")
      .eq("id", documentId)
      .single();

    if (fetchErr || !doc) {
      return { success: false, error: "Doküman bulunamadı veya erişim yetkiniz yok." };
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 60, { download: doc.file_name });

    if (error || !data) {
      console.error("İndirme Linki Oluşturma Hatası:", error);
      return { success: false, error: error?.message || "İndirme linki oluşturulamadı." };
    }

    return { success: true, url: data.signedUrl };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteDocumentAction(documentId: string) {
  try {
    const supabase = await createClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const { data: doc } = await supabase
      .from("documents")
      .select("customer_id, storage_path")
      .eq("id", documentId)
      .single();

    if (!doc) {
      return { success: false, error: "Doküman bulunamadı veya erişim yetkiniz yok." };
    }

    // Storage RLS erişimi (sahiplik) documents tablosuyla aynı kapsamı
    // izler; önce storage nesnesi silinir, sonra metadata satırı silinir.
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    if (storageError) {
      console.error("Dosya Silme Hatası:", storageError);
      return { success: false, error: storageError.message };
    }

    const { error, count } = await supabase
      .from("documents")
      .delete({ count: "exact" })
      .eq("id", documentId);

    if (error) {
      console.error("Doküman Metadata Silme Hatası:", error);
      return { success: false, error: error.message };
    }

    if (!count) {
      return {
        success: false,
        error: "Bu dokümanı silme yetkiniz yok veya doküman bulunamadı.",
      };
    }

    revalidatePath(`/shared/customers/${doc.customer_id}`);
    return { success: true };
  } catch (error: unknown) {
    console.error("Action Failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
