import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KIROMOV Core | Centro Clínico",
  description: "Web App interna de gestión clínica y operativa - KIROMOV Centro Clínico",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`h-full ${inter.variable}`}>
      <body className="bg-slate-50/60 text-slate-900 antialiased flex flex-col min-h-full font-sans">
        <div className="flex min-h-screen bg-slate-50/60 text-slate-900 antialiased">
          {/* Sidebar fijo en escritorio */}
          <Sidebar />

          {/* Área de contenido */}
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main className="flex-1 p-3 sm:p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto overflow-x-hidden">
              {children}
            </main>
          </div>

          {/* Barra inferior en móviles */}
          <BottomNav />
        </div>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
