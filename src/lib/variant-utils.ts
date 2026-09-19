import type { ProductVariant, VariantOption } from "@/types/product.types";

/**
 * Ürün varyant seçeneklerini kaydetmeden önce normalize eder.
 * Admin formu "Sistem Kodu" (value) alanını boş bırakmaya izin veriyor;
 * boş veya aynı grup içinde tekrar eden value'lar, satış konfigüratöründe
 * seçim eşleştirmesini (selections[variantId] === option.value) bozar —
 * iki seçenek aynı value'ya sahipse biri asla ayrı seçilemez hale gelir.
 * Bu fonksiyon boş value'ları label'dan türetir ve grup içinde benzersiz
 * olmasını garanti eder.
 */
function slugify(text: string): string {
  return (text || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[ığüşöç]/g, (c) =>
      ({ ı: "i", ğ: "g", ü: "u", ş: "s", ö: "o", ç: "c" })[c] || c,
    )
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeVariants(
  variants: Partial<ProductVariant>[],
): Partial<ProductVariant>[] {
  if (!Array.isArray(variants)) return [];

  return variants.map((group, groupIndex) => {
    const usedValues = new Set<string>();
    const options = (group.options || []).map((option: VariantOption, optIndex: number) => {
      const value = slugify(option.value) || slugify(option.label) || `secenek_${optIndex + 1}`;
      let candidate = value;
      let suffix = 2;
      while (usedValues.has(candidate)) {
        candidate = `${value}_${suffix}`;
        suffix += 1;
      }
      usedValues.add(candidate);
      return { ...option, value: candidate };
    });

    return {
      ...group,
      group_name: group.group_name || `Parametre ${groupIndex + 1}`,
      options,
    };
  });
}
