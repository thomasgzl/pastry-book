import type { Metadata } from "next";
import { Bodoni_Moda, Karla } from "next/font/google";
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${bodoniModa.variable} ${karla.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ivoire text-cacao">
        {children}
      </body>
    </html>
  );
}
