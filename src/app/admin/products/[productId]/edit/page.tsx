"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Loader2,
  Layers,
  Package,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { getCategoriesAction } from "@/actions/product.actions";
import {
  getProductByIdAction,
  updateProductAction,
} from "@/actions/product-edit.actions";

type PriceEffectType = "fixed" | "multiplier" | "percentage";

interface VariantOption {
  label: string;
  value: string;
  price_effect: { type: PriceEffectType; amount: number };
  is_default: boolean;
  inventory_item_id?: string | null;
  required_amount?: number;
}

interface VariantGroup {
  id?: string;
  group_name: string;
  is_required: boolean;
  sort_order: number;
  options: VariantOption[];
}

const emptyOption: VariantOption = {
  label: "",
  value: "",
  price_effect: { type: "fixed", amount: 0 },
  is_default: false,
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Product fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [basePrice, setBasePrice] = useState(0);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [isActive, setIsActive] = useState(true);
  const [variants, setVariants] = useState<VariantGroup[]>([]);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );

  useEffect(() => {
    async function loadData() {
      const [catResult, prodResult] = await Promise.all([
        getCategoriesAction(),
        getProductByIdAction(productId),
      ]);

      if (catResult.success && catResult.data) {
        setCategories(catResult.data);
      }

      if (prodResult.success && prodResult.data) {
        const p = prodResult.data;
        setName(p.name || "");
        setSku(p.sku || "");
        setDescription(p.description || "");
        setCategoryId(p.category_id || "");
        setBasePrice(Number(p.base_price) || 0);
        setBaseCurrency(p.base_currency || "USD");
        setIsActive(p.is_active ?? true);

        if (p.product_variants && p.product_variants.length > 0) {
          setVariants(
            p.product_variants.map((v: any) => ({
              id: v.id,
              group_name: v.group_name,
              is_required: v.is_required,
              sort_order: v.sort_order,
              options: v.options || [],
            }))
          );
        }
      } else {
        setErrorMsg("Ürün bulunamadı veya yetki hatası.");
      }

      setIsLoading(false);
    }
    loadData();
  }, [productId]);

  // Variant helpers
  const addVariantGroup = () => {
    setVariants((prev) => [
      ...prev,
      {
        group_name: "",
        is_required: true,
        sort_order: prev.length,
        options: [{ ...emptyOption }],
      },
    ]);
  };

  const removeVariantGroup = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariantGroup = (index: number, data: Partial<VariantGroup>) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...data };
      return copy;
    });
  };

  const addOption = (groupIndex: number) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[groupIndex] = {
        ...copy[groupIndex],
        options: [...copy[groupIndex].options, { ...emptyOption }],
      };
      return copy;
    });
  };

  const updateOption = (
    groupIndex: number,
    optIndex: number,
    data: Partial<VariantOption>
  ) => {
    setVariants((prev) => {
      const copy = [...prev];
      const opts = [...copy[groupIndex].options];
      opts[optIndex] = { ...opts[optIndex], ...data };
      copy[groupIndex] = { ...copy[groupIndex], options: opts };
      return copy;
    });
  };

  const removeOption = (groupIndex: number, optIndex: number) => {
    setVariants((prev) => {
      const copy = [...prev];
      const opts = [...copy[groupIndex].options];
      opts.splice(optIndex, 1);
      copy[groupIndex] = { ...copy[groupIndex], options: opts };
      return copy;
    });
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await updateProductAction(productId, {
      name,
      sku,
      description,
      categoryId,
      basePrice,
      baseCurrency,
      isActive,
      variants,
    });

    if (!result.success) {
      setErrorMsg(result.error || "Güncelleme başarısız oldu.");
    } else {
      setSuccessMsg("Ürün başarıyla güncellendi! ✓");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/products"
                className="p-2 -ml-2 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  Ürünü Düzenle
                </h1>
                <p className="text-xs text-slate-500">{name || "—"}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                onClick={() => router.push("/admin/products")}
              >
                İptal
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSubmitting || !name || basePrice < 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Güncelle
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-medium">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Base Info */}
          <div className="lg:col-span-4 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Temel Bilgiler
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Ürün adı, fiyatı ve kategori bilgilerini güncelleyin.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="space-y-2">
                  <Label>
                    Ürün Kategorisi <span className="text-red-500">*</span>
                  </Label>
                  <SelectNative
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full"
                  >
                    <option value="">-- Kategori Seçin --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </SelectNative>
                </div>

                <div className="space-y-2">
                  <Label>
                    Ürün Adı <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Örn: 3000kVA Dağıtım Trafosu"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stok Kodu (SKU)</Label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="TRF-0001"
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Taban Fiyat <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      min="0"
                      value={basePrice}
                      onChange={(e) =>
                        setBasePrice(parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                      className="flex-1 text-right"
                    />
                    <SelectNative
                      value={baseCurrency}
                      onChange={(e) => setBaseCurrency(e.target.value)}
                      className="w-28 bg-slate-50"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="TRY">TRY</option>
                    </SelectNative>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ürün Açıklaması</Label>
                  <textarea
                    className="w-full min-h-[100px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-1 focus-visible:ring-brand-500"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ürün hakkında kısa bilgi..."
                  />
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                  />
                  <Label className="text-sm text-slate-600 cursor-pointer">
                    Ürün Aktif (Satışa açık)
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Variants */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Ürün Varyasyonları
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Müşterinin seçebileceği parametreleri düzenleyin.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={addVariantGroup}
                className="shrink-0 bg-white"
              >
                <Plus className="mr-2 h-4 w-4" /> Grup Ekle
              </Button>
            </div>

            <div className="space-y-5">
              {variants.map((group, groupIndex) => (
                <Card key={groupIndex} className="overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 flex items-center space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-medium">
                        {groupIndex + 1}
                      </div>
                      <div className="flex-1 max-w-sm">
                        <Input
                          value={group.group_name}
                          onChange={(e) =>
                            updateVariantGroup(groupIndex, {
                              group_name: e.target.value,
                            })
                          }
                          placeholder="Parametre Grubu (Örn: Güç Seviyesi)"
                          className="h-9 font-medium"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVariantGroup(groupIndex)}
                      className="text-slate-500 hover:text-red-600 px-2 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-white border-b border-slate-100 text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-medium">Seçenek Adı</th>
                          <th className="px-5 py-3 font-medium">Sistem Kodu</th>
                          <th className="px-5 py-3 font-medium">Fiyat Etkisi</th>
                          <th className="px-5 py-3 font-medium">Miktar</th>
                          <th className="px-5 py-3 font-medium text-center">Varsayılan</th>
                          <th className="px-5 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {(group.options || []).map((option, optIdx) => (
                          <tr
                            key={optIdx}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-5 py-3 align-top">
                              <Input
                                value={option.label}
                                onChange={(e) =>
                                  updateOption(groupIndex, optIdx, {
                                    label: e.target.value,
                                  })
                                }
                                placeholder="Örn: 50 MVA"
                                className="h-9 w-full min-w-[120px]"
                              />
                            </td>
                            <td className="px-5 py-3 align-top">
                              <Input
                                value={option.value}
                                onChange={(e) =>
                                  updateOption(groupIndex, optIdx, {
                                    value: e.target.value,
                                  })
                                }
                                placeholder="50_mva"
                                className="h-9 w-full min-w-[100px] text-slate-500"
                              />
                            </td>
                            <td className="px-5 py-3 align-top">
                              <SelectNative
                                value={option.price_effect.type}
                                onChange={(e) =>
                                  updateOption(groupIndex, optIdx, {
                                    price_effect: {
                                      ...option.price_effect,
                                      type: e.target.value as PriceEffectType,
                                    },
                                  })
                                }
                                className="h-9 w-[130px]"
                              >
                                <option value="fixed">Sabit (+)</option>
                                <option value="multiplier">Çarpan (x)</option>
                                <option value="percentage">Yüzde (%)</option>
                              </SelectNative>
                            </td>
                            <td className="px-5 py-3 align-top">
                              <Input
                                type="number"
                                value={option.price_effect.amount}
                                onChange={(e) =>
                                  updateOption(groupIndex, optIdx, {
                                    price_effect: {
                                      ...option.price_effect,
                                      amount: parseFloat(e.target.value) || 0,
                                    },
                                  })
                                }
                                placeholder="0"
                                className="h-9 w-24 text-right"
                              />
                            </td>
                            <td className="px-5 py-3 text-center align-middle">
                              <div className="flex justify-center">
                                <input
                                  title="Varsayılan"
                                  type="radio"
                                  name={`default_${groupIndex}`}
                                  checked={option.is_default}
                                  onChange={() => {
                                    group.options.forEach((_, i) => {
                                      updateOption(groupIndex, i, {
                                        is_default: i === optIdx,
                                      });
                                    });
                                  }}
                                  className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer"
                                />
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right align-top">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(groupIndex, optIdx)}
                                className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-slate-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-white border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addOption(groupIndex)}
                      className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 w-full justify-start text-xs rounded-md"
                    >
                      <Plus className="mr-2 h-3 w-3" /> Seçenek Ekle
                    </Button>
                  </div>
                </Card>
              ))}

              {variants.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-xl py-16 px-6 text-center bg-white">
                  <Layers className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">
                    Henüz Parametre Eklenmedi
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                    Müşterilerinizin ürün yapılandırırken seçeceği seçenekleri
                    eklemeye başlamak için aşağıya tıklayın.
                  </p>
                  <Button variant="secondary" onClick={addVariantGroup}>
                    <Plus className="mr-2 h-4 w-4" /> Parametre Ekle
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
