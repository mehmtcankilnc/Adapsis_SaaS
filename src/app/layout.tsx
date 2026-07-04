import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
        {children}
      </body>
    </html>
  );
}
