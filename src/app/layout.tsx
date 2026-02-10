import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "../components/session-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { cookies } from "next/headers";
import { CookieBanner } from "@/components/cookies/CookieBanner";
import { ThemeCookieSync } from "@/components/cookies/ThemeCookieSync";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Crossword.Network - Cozy Crossword Puzzles",
  description: "Solve crossword puzzles at your own pace with progress tracking and a calm, focused experience.",
  keywords: ["crossword", "puzzles", "single-player", "relaxing", "daily puzzles"],
  authors: [{ name: "Maple-Tyne Technologies Inc." }],
  creator: "Maple-Tyne Technologies Inc.",
  publisher: "Maple-Tyne Technologies Inc.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://crossword.network",
    title: "Crossword.Network - Cozy Crossword Puzzles",
    description: "Solve crossword puzzles at your own pace with progress tracking and a calm, focused experience.",
    siteName: "Crossword.Network",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crossword.Network - Cozy Crossword Puzzles",
    description: "Solve crossword puzzles at your own pace with progress tracking and a calm, focused experience.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const themeCookie = cookieStore.get("cw_theme")?.value;
  const htmlClassName = themeCookie === "dark" ? "dark" : undefined;

  return (
    <html lang="en" suppressHydrationWarning className={htmlClassName}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="canonical" href="https://crossword.network" />
      </head>
      <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
            <ThemeCookieSync />
            <CookieBanner />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
