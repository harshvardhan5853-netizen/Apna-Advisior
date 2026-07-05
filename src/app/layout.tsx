import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Apna Advisor — Wealth. Simplified.",
  description:
    "A premium portfolio companion for Indian retail investors. Import from any broker, in seconds.",
  applicationName: "Apna Advisor",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#022c22",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${sora.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased selection:bg-emerald-500/30">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
