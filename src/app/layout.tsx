import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Tambacan Waste App",
  description: "UI for residents management",
  themeColor: "#0d9488", // For browsers & Android PWA header
  manifest: "/manifest.webmanifest", // Required for PWA
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* ✅ PWA Essentials */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0d9488" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-pink-50 to-red-100">
        {children}
      </body>
    </html>
  );
}
