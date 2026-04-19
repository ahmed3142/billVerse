import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Space_Grotesk } from "next/font/google";
import Script from "next/script";

import { Providers } from "@/components/providers";
import { APP_NAME, APP_SUBTITLE, THEME_STORAGE_KEY } from "@/lib/constants";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} · ${APP_SUBTITLE}`,
  description:
    "BillVerse helps building administrators publish monthly statements, track payments, and keep residents informed in one streamlined workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-app antialiased">
        <Script id="theme-script" strategy="beforeInteractive">
          {`(function(){try{var key='${THEME_STORAGE_KEY}';var saved=localStorage.getItem(key);var theme=saved||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',theme);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
