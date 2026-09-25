"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SelectNative } from "@/components/ui/select-native";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCategoryAction } from "@/actions/category.actions";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const NEW_CATEGORY_VALUE = "__new__";

/**
 * Ürün oluşturma/düzenleme formlarındaki kategori seçimi — her şirket kendi
 * ürün türüne göre serbestçe yeni bir kategori açıp hemen seçebilsin diye
 * dropdown'a "+ Yeni Kategori Ekle..." seçeneği eklenmiş hâli.
 */
export function CategorySelectField({
  categories,
  value,
  onChange,
  onCategoryCreated,
  disabled,
}: {
  categories: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  onCategoryCreated: (category: { id: string; name: string }) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    setIsCreating(true);
    const result = await createCategoryAction({ name });
    setIsCreating(false);

    if (result.success && result.category) {
      onCategoryCreated(result.category);
      onChange(result.category.id);
      setDialogOpen(false);
      setName("");
      toast.success(`"${result.category.name}"${t("categorySelect.toast.createSuccessSuffix")}`);
    } else {
      toast.error(t("categorySelect.toast.createError"), { description: result.error });
    }
  }

  return (
    <>
      <SelectNative
        value={value}
        onChange={(e) => {
          if (e.target.value === NEW_CATEGORY_VALUE) {
            setDialogOpen(true);
            return;
          }
          onChange(e.target.value);
        }}
        disabled={disabled}
        className="w-full"
      >
        <option value="">{t("categorySelect.placeholderOption")}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value={NEW_CATEGORY_VALUE}>{t("categorySelect.newCategoryOption")}</option>
      </SelectNative>

      <Dialog open={dialogOpen} onOpenChange={(v) => !isCreating && setDialogOpen(v)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("categorySelect.dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("categorySelect.dialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 py-4 space-y-2">
            <Label htmlFor="new-category-name">{t("categorySelect.dialog.nameLabel")}</Label>
            <Input
              id="new-category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("categorySelect.dialog.namePlaceholder")}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={isCreating}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={isCreating || name.trim().length < 2}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("categorySelect.dialog.creating")}
                </>
              ) : (
                t("categorySelect.dialog.create")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
