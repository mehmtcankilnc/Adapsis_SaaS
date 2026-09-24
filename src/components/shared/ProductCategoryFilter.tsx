"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SelectNative } from "@/components/ui/select-native";

export function ProductCategoryFilter({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("category") || "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("category", value);
    } else {
      params.delete("category");
    }
    router.push(`/admin/products${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <SelectNative
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="w-full sm:w-56"
    >
      <option value="">Tüm Kategoriler</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </SelectNative>
  );
}
