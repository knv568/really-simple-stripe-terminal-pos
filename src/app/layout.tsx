import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { BRAND } from "@/lib/branding";
import { PWA_COLORS, pwaManifestIconPaths } from "@/lib/pwa";

const { icon192, icon512, appleTouch } = pwaManifestIconPaths();
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BRAND.pageTitle,
  description: BRAND.pageDescription,
  robots: { index: false, follow: false },
  applicationName: BRAND.pwaShortName,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRAND.pwaShortName,
  },
  icons: {
    icon: [
      { url: icon192, sizes: "192x192", type: "image/png" },
      { url: icon512, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: appleTouch, sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: PWA_COLORS.theme,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>{children}</body>
    </html>
  );
}
