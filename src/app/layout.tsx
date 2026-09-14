import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "KIROMOV Core | Centro Clínico",
  description: "Web App interna de gestión clínica y operativa - KIROMOV Centro Clínico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="bg-slate-50/50 text-slate-900 antialiased flex flex-col min-h-full">
        <Header />
        {/* pb-20 en móvil asegura que la barra inferior no tape el contenido final */}
        <div className="flex-1 pb-20 md:pb-6">
          {children}
        </div>
        <BottomNav />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
