import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Karla } from "next/font/google";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import "./globals.css";

const bodoniModa = Bodoni_Moda({
  variable: "--font-bodoni-moda",
  subsets: ["latin"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Le Grand Livre de Pâtisserie",
  description: "Base privée de recettes professionnelles.",
  // Icône SVG placeholder (voir manifest.ts) : dégradation gracieuse sur
  // iOS, qui ne sait pas afficher un SVG en icône d'accueil.
  icons: { apple: "/icons/icon.svg" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Grand Livre",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Active les zones sûres iOS/iPadOS (encoche, barre de gestes) —
  // combiné au padding `env(safe-area-inset-*)` dans globals.css.
  viewportFit: "cover",
  themeColor: "#556043",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${bodoniModa.variable} ${karla.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ivoire text-cacao">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
