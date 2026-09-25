"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateGlobalSettingsAction } from "@/actions/global-settings.actions";
import type { GlobalSettings } from "@/types/product.types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function GeneralSettingsForm({ settings }: { settings: GlobalSettings | null }) {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    company_name: settings?.company_name || "",
    company_address: settings?.company_address || "",
    iban: settings?.iban || "",
    tax_rate: settings?.tax_rate || 20,
    default_margin: settings?.default_margin || 10,
    quote_footer_text: settings?.quote_footer_text || "",
    discount_approval_threshold: settings?.discount_approval_threshold ?? 5,
    quote_followup_days: settings?.quote_followup_days ?? 3,
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);

    const res = await updateGlobalSettingsAction(formData);

    setIsSubmitting(false);

    if (res.success) {
      toast.success(t("admin.settings.general.toastUpdated"));
    } else {
      toast.error(t("admin.settings.general.toastUpdateFailedTitle"), {
        description: res.error || t("admin.settings.general.toastUpdateFailedDescription"),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">{t("admin.settings.general.companyInfoHeading")}</h3>
          <div className="space-y-2">
            <Label>{t("admin.settings.general.companyNameLabel")}</Label>
            <Input
              value={formData.company_name}
              onChange={(e) => handleChange("company_name", e.target.value)}
              placeholder={t("admin.settings.general.companyNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin.settings.general.companyAddressLabel")}</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.company_address}
              onChange={(e) => handleChange("company_address", e.target.value)}
              placeholder={t("admin.settings.general.companyAddressPlaceholder")}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">{t("admin.settings.general.financeQuoteHeading")}</h3>
          <div className="space-y-2">
            <Label>{t("admin.settings.general.ibanLabel")}</Label>
            <Input
              value={formData.iban}
              onChange={(e) => handleChange("iban", e.target.value)}
              placeholder={t("admin.settings.general.ibanPlaceholder")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("admin.settings.general.taxRateLabel")}</Label>
              <Input
                type="number"
                value={formData.tax_rate}
                onChange={(e) => handleChange("tax_rate", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.settings.general.defaultMarginLabel")}</Label>
              <Input
                type="number"
                value={formData.default_margin}
                onChange={(e) => handleChange("default_margin", Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("admin.settings.general.discountThresholdLabel")}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={formData.discount_approval_threshold}
              onChange={(e) => handleChange("discount_approval_threshold", Number(e.target.value))}
            />
            <p className="text-xs text-slate-500">
              {t("admin.settings.general.discountThresholdHelp")}
            </p>
          </div>
          <div className="space-y-2">
            <Label>{t("admin.settings.general.followupDaysLabel")}</Label>
            <Input
              type="number"
              min={1}
              value={formData.quote_followup_days}
              onChange={(e) => handleChange("quote_followup_days", Number(e.target.value))}
            />
            <p className="text-xs text-slate-500">
              {t("admin.settings.general.followupDaysHelp")}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">{t("admin.settings.general.footerHeading")}</h3>
        <div className="space-y-2">
          <Label>{t("admin.settings.general.footerTextLabel")}</Label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            value={formData.quote_footer_text}
            onChange={(e) => handleChange("quote_footer_text", e.target.value)}
            placeholder={t("admin.settings.general.footerTextPlaceholder")}
          />
        </div>
      </div>

      <div className="pt-6 flex justify-end">
        <Button onClick={handleSave} disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px]">
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("admin.settings.general.saving")}</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> {t("admin.settings.general.saveSettings")}</>
          )}
        </Button>
      </div>
    </div>
  );
}
