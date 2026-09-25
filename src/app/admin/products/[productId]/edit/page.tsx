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
import { toast } from "sonner";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { CategorySelectField } from "@/components/shared/CategorySelectField";
import { getCategoriesAction } from "@/actions/product.actions";
import {
  getProductByIdAction,
  updateProductAction,
} from "@/actions/product-edit.actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

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
  const { t } = useLanguage();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadErrorMsg, setLoadErrorMsg] = useState<string | null>(null);

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
            p.product_variants.map((v: {
              id: string;
              group_name: string;
              is_required: boolean;
              sort_order: number;
              options: VariantOption[];
            }) => ({
              id: v.id,
              group_name: v.group_name,
              is_required: v.is_required,
              sort_order: v.sort_order,
              options: v.options || [],
            }))
          );
        }
      } else {
        setLoadErrorMsg(t("admin.products.loadErrorMessage"));
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

    setIsSubmitting(false);

    if (!result.success) {
      toast.error(t("admin.products.updateFailedToast"), {
        description: result.error || undefined,
      });
    } else {
      toast.success(t("admin.products.updatedToast"));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 pb-24">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Skeleton className="h-5 w-48" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-20 rounded-lg" />
                <Skeleton className="h-9 w-32 rounded-lg" />
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-9 w-32 rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 sm:py-0 sm:h-16">
            <div className="flex items-center space-x-4 min-w-0">
              <Link
                href="/admin/products"
                className="p-2 -ml-2 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-slate-900 truncate">
                  {t("admin.products.editPageTitle")}
                </h1>
                <p className="text-xs text-slate-500 truncate">{name || "—"}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <Button
                variant="ghost"
                onClick={() => router.push("/admin/products")}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSubmitting || !name || basePrice < 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    {t("admin.products.savingButton")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> {t("admin.products.updateButton")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loadErrorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-medium">
            {loadErrorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Base Info */}
          <div className="lg:col-span-4 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {t("admin.products.basicInfoTitle")}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {t("admin.products.basicInfoDescriptionEdit")}
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="space-y-2">
                  <Label>
                    {t("admin.products.categoryLabel")} <span className="text-red-500">*</span>
                  </Label>
                  <CategorySelectField
                    categories={categories}
                    value={categoryId}
                    onChange={setCategoryId}
                    onCategoryCreated={(c) => setCategories((prev) => [...prev, c])}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    {t("admin.products.nameLabel")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("admin.products.namePlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("admin.products.skuLabel")}</Label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder={t("admin.products.skuPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    {t("admin.products.basePriceLabel")} <span className="text-red-500">*</span>
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
                  <Label>{t("admin.products.descriptionLabel")}</Label>
                  <textarea
                    className="w-full min-h-[100px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-1 focus-visible:ring-brand-500"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("admin.products.descriptionPlaceholder")}
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
                    {t("admin.products.activeLabel")}
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
                  {t("admin.products.variantsTitle")}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {t("admin.products.variantsDescriptionEdit")}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={addVariantGroup}
                className="shrink-0 bg-white"
              >
                <Plus className="mr-2 h-4 w-4" /> {t("admin.products.addGroupButton")}
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
                          placeholder={t("admin.products.groupNamePlaceholder")}
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
                          <th className="px-5 py-3 font-medium">{t("admin.products.columnOptionName")}</th>
                          <th className="px-5 py-3 font-medium">{t("admin.products.columnSystemCode")}</th>
                          <th className="px-5 py-3 font-medium">{t("admin.products.columnPriceEffect")}</th>
                          <th className="px-5 py-3 font-medium">{t("admin.products.columnAmount")}</th>
                          <th className="px-5 py-3 font-medium text-center">{t("admin.products.columnDefault")}</th>
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
                                placeholder={t("admin.products.optionLabelPlaceholder")}
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
                                placeholder={t("admin.products.optionValuePlaceholder")}
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
                                <option value="fixed">{t("admin.products.priceEffectFixed")}</option>
                                <option value="multiplier">{t("admin.products.priceEffectMultiplier")}</option>
                                <option value="percentage">{t("admin.products.priceEffectPercentage")}</option>
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
                                  title={t("admin.products.columnDefault")}
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
                      <Plus className="mr-2 h-3 w-3" /> {t("admin.products.addOptionButton")}
                    </Button>
                  </div>
                </Card>
              ))}

              {variants.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-xl py-16 px-6 text-center bg-white">
                  <Layers className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">
                    {t("admin.products.noVariantsTitle")}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                    {t("admin.products.noVariantsDescription")}
                  </p>
                  <Button variant="secondary" onClick={addVariantGroup}>
                    <Plus className="mr-2 h-4 w-4" /> {t("admin.products.addParameterButton")}
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
