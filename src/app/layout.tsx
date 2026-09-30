import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { getDb } from "@/lib/store";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-source-serif",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "The Ritzy Heirloom",
    template: "%s · The Ritzy Heirloom",
  },
  description:
    "A boutique shop in Neptune Beach, Florida, filled with antiques, vintage finds, fine art, European and English pieces, antique French fabrics and wallpapers, and one-of-a-kind treasures.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  getDb();
  return (
    <html lang="en" className={`${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-full font-serif">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
