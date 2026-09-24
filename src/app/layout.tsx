import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Adapsis | Enterprise Product Configurator",
  description: "Modern enterprise B2B SaaS for dynamic product configurations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.className} font-sans antialiased bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900`}>
        <LanguageProvider>
          <TooltipProvider delayDuration={200}>
            {children}
          </TooltipProvider>
        </LanguageProvider>
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            classNames: {
              toast: "!bg-white !border !border-slate-200 !shadow-lg !rounded-xl",
              title: "!text-slate-900 !font-semibold",
              description: "!text-slate-500",
              actionButton: "!bg-brand-600 !text-white",
              cancelButton: "!bg-slate-100 !text-slate-600",
              closeButton: "!bg-slate-100 !border-slate-200 !text-slate-500",
              success: "!bg-emerald-50 !border-emerald-200 !text-emerald-800",
              error: "!bg-red-50 !border-red-200 !text-red-700",
              warning: "!bg-amber-50 !border-amber-200 !text-amber-800",
              info: "!bg-brand-50 !border-brand-200 !text-brand-800",
            },
          }}
        />
      </body>
    </html>
  );
}
