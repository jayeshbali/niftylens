import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://niftylens.vercel.app"
  ),
  title: "NiftyLens — India & US Market Valuation Dashboard",
  description:
    "Track Indian and US equity market valuations: PE ratio, PB ratio, EPS growth, composite score, and more. 26-year Indian and 1871–present US annual snapshot data.",
  keywords: [
    "Nifty 50",
    "S&P 500",
    "India stock market",
    "US stock market",
    "valuation",
    "PE ratio",
    "PB ratio",
    "EPS growth",
    "composite score",
    "market dashboard",
  ],
  openGraph: {
    title: "NiftyLens — India & US Market Valuation Dashboard",
    description:
      "Indian and US equity valuation data side by side. PE, PB, EPS, composite score and more.",
    type: "website",
    locale: "en_IN",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "NiftyLens Dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NiftyLens — India & US Market Valuation Dashboard",
    description:
      "Indian and US equity valuation data side by side. PE, PB, EPS, composite score and more.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
