"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Building2, Search, Loader2, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCustomerAction } from "@/actions/customer.actions";
import type { Customer } from "@/types/product.types";

export function CustomersClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCustomers = customers.filter(
    (c) =>
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateCustomer = async () => {
    setIsSubmitting(true);

    const res = await createCustomerAction({
      company_name: companyName,
      contact_name: contactName,
      email,
      phone,
      address,
    });

    setIsSubmitting(false);

    if (res.success && res.customer) {
      setCustomers([res.customer, ...customers]);
      toast.success("Müşteri oluşturuldu");
      setIsDialogOpen(false);
      setCompanyName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setAddress("");
    } else {
      toast.error("Müşteri oluşturulamadı", {
        description: res.error || "Beklenmeyen bir hata oluştu.",
      });
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Müşteri ara..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="primary">
              <Plus className="mr-2 h-4 w-4" /> Yeni Müşteri Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Müşteri Oluştur</DialogTitle>
              <DialogDescription>
                Müşteri veritabanına yeni bir kayıt ekleyin.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 px-5 py-4 overflow-y-auto">
              <div className="space-y-2">
                <Label>Firma Adı <span className="text-red-500">*</span></Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Örn: ABC Lojistik A.Ş." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Yetkili Kişi</Label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Ahmet Yılmaz" />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 5XX XXX XX XX" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-posta Adresi</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@abclojistik.com" />
              </div>
              <div className="space-y-2">
                <Label>Firma Adresi</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Açık adres bilgisi..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>İptal</Button>
              <Button variant="primary" onClick={handleCreateCustomer} disabled={isSubmitting || !companyName.trim()}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor...</> : "Kaydet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="p-8 bg-slate-50/30">
          <EmptyState
            icon={search ? Search : Users}
            title={search ? "Sonuç Bulunamadı" : "Henüz Müşteri Yok"}
            description={
              search
                ? `"${search}" ile eşleşen bir müşteri bulunamadı.`
                : "Sistemde kayıtlı bir müşteri bulunmuyor. İlk müşterinizi ekleyerek başlayın."
            }
            action={
              search ? (
                <Button variant="outline" onClick={() => setSearch("")}>
                  Aramayı Temizle
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Yeni Müşteri Ekle
                </Button>
              )
            }
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Firma Adı</TableHead>
              <TableHead>Yetkili Kişi</TableHead>
              <TableHead>İletişim</TableHead>
              <TableHead>Adres</TableHead>
              <TableHead className="text-right">Kayıt Tarihi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow
                key={customer.id}
                onClick={() => router.push(`/shared/customers/${customer.id}`)}
                className="cursor-pointer"
              >
                <TableCell className="font-semibold text-slate-800">
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                    {customer.company_name}
                  </div>
                </TableCell>
                <TableCell>{customer.contact_name || "—"}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {customer.email && <div>{customer.email}</div>}
                    {customer.phone && <div className="text-slate-500">{customer.phone}</div>}
                    {!customer.email && !customer.phone && "—"}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={customer.address || ""}>
                  {customer.address || "—"}
                </TableCell>
                <TableCell className="text-right text-slate-500 text-sm">
                  {customer.created_at ? new Date(customer.created_at).toLocaleDateString("tr-TR") : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
