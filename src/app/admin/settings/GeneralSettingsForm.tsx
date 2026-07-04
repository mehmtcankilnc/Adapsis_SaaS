"use client";

import React, { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateGlobalSettingsAction } from "@/actions/global-settings.actions";

export function GeneralSettingsForm({ settings }: { settings: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    company_name: settings?.company_name || "",
    company_address: settings?.company_address || "",
    iban: settings?.iban || "",
    tax_rate: settings?.tax_rate || 20,
    default_margin: settings?.default_margin || 10,
    quote_footer_text: settings?.quote_footer_text || "",
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await updateGlobalSettingsAction(formData);

    if (res.success) {
      setSuccessMsg("Sistem ayarları başarıyla güncellendi.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(res.error || "Güncelleme sırasında bir hata oluştu.");
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg border border-emerald-200">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">Şirket Bilgileri</h3>
          <div className="space-y-2">
            <Label>Şirket Unvanı</Label>
            <Input 
              value={formData.company_name} 
              onChange={(e) => handleChange("company_name", e.target.value)} 
              placeholder="A.Ş. / Ltd. Şti."
            />
          </div>
          <div className="space-y-2">
            <Label>Firma Adresi</Label>
            <textarea 
              className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.company_address} 
              onChange={(e) => handleChange("company_address", e.target.value)} 
              placeholder="Fatura Adresi"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">Finans & Teklif Ayarları</h3>
          <div className="space-y-2">
            <Label>Banka IBAN Bilgisi</Label>
            <Input 
              value={formData.iban} 
              onChange={(e) => handleChange("iban", e.target.value)} 
              placeholder="TR00 0000 ..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>KDV Oranı (%)</Label>
              <Input 
                type="number"
                value={formData.tax_rate} 
                onChange={(e) => handleChange("tax_rate", Number(e.target.value))} 
              />
            </div>
            <div className="space-y-2">
              <Label>Varsayılan Kar Marjı (%)</Label>
              <Input 
                type="number"
                value={formData.default_margin} 
                onChange={(e) => handleChange("default_margin", Number(e.target.value))} 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">Teklif Footer / Geçerlilik Metni</h3>
        <div className="space-y-2">
          <Label>Alt Bilgi Metni</Label>
          <textarea 
            className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            value={formData.quote_footer_text} 
            onChange={(e) => handleChange("quote_footer_text", e.target.value)} 
            placeholder="Bu teklif 15 gün geçerlidir..."
          />
        </div>
      </div>

      <div className="pt-6 flex justify-end">
        <Button onClick={handleSave} disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px]">
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> Ayarları Kaydet</>
          )}
        </Button>
      </div>
    </div>
  );
}
