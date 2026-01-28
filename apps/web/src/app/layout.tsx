import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BabyTracker Pro",
  description: "Modern activity tracker for your baby",
};

import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { TopBar } from "@/components/layout/TopBar";
import { BackgroundOverlay } from "@/components/layout/BackgroundOverlay";

import { ConfigurationProvider } from "@/components/ConfigurationProvider";
import { AuthProvider } from "@/components/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable}`}
    >
      <body
        suppressHydrationWarning
        className="antialiased min-h-screen bg-background flex flex-col md:flex-row"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
          themes={["light", "dark", "yoyo"]}
        >
          <LanguageProvider>
            <AuthProvider>
              <ConfigurationProvider>
                <Sidebar />
                <main className="flex-1 flex flex-col pb-20 md:pb-0 relative">
                  <BackgroundOverlay />
                  <TopBar />
                  <div className="flex-1 overflow-y-auto relative z-10">
                    {children}
                  </div>
                </main>
                <MobileNav />
                <Toaster position="top-center" richColors />
              </ConfigurationProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
