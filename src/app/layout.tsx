import type { Metadata, Viewport } from "next";
import { Source_Serif_4 } from "next/font/google";
import { headers } from "next/headers";
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
  applicationName: "Ritzy desk",
  appleWebApp: {
    capable: true,
    title: "Ritzy desk",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#b07c28",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  getDb();
  const headerStore = await headers();
  const gate = headerStore.get("x-ritzy-gate") === "1";
  const desk = headerStore.get("x-ritzy-desk") === "1";
  return (
    <html lang="en" className={`${sourceSerif.variable} h-full antialiased`}>
      <body className={`min-h-full font-serif ${gate || desk ? "" : "pb-24 md:pb-0"}`}>
        {gate || desk ? null : <SiteHeader />}
        {children}
      </body>
    </html>
  );
}
