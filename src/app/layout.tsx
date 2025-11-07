import "./globals.css";
import type { ReactNode } from "react";
// 1. Import Viewport from 'next'
import type { Metadata, Viewport } from 'next';

// 2. Metadata object no longer contains themeColor
export const metadata: Metadata = {
  title: "Waste Collection Schedule on Brgy Tambacan",
  description: "UI for residents management",
  manifest: "/manifest.webmanifest", // Required for PWA
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  // PWA settings are now handled here
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  },
  applicationName: "Waste App",
};

// 3. Added a new Viewport export for themeColor
export const viewport: Viewport = {
  themeColor: "#0d9488", // For browsers & Android PWA header
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/* 4. The <head> is now clean! 
        Next.js will automatically add the manifest and theme-color tags 
        from the metadata and viewport exports above.
      */}
      <head />
      <body className="min-h-screen bg-gradient-to-br from-pink-50 to-red-100">
        {children}
      </body>
    </html>
  );
}