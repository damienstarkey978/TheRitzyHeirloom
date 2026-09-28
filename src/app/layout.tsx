import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  title: "The Ritzy Heirloom",
  description:
    "A boutique shop in Neptune Beach, Florida, filled with antiques, vintage finds, fine art, European and English pieces, antique French fabrics and wallpapers, and one-of-a-kind treasures.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-full font-serif">{children}</body>
    </html>
  );
}
