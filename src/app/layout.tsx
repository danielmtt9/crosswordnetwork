import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "../components/session-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Crossword.Network - Premium Crossword Puzzles",
  description: "Solve premium crossword puzzles with multiplayer collaboration, progress tracking, and unlimited hints. Start your 1-week free trial today.",
  keywords: ["crossword", "puzzles", "multiplayer", "premium", "subscription"],
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
    title: "Crossword.Network - Premium Crossword Puzzles",
    description: "Solve premium crossword puzzles with multiplayer collaboration, progress tracking, and unlimited hints.",
    siteName: "Crossword.Network",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crossword.Network - Premium Crossword Puzzles",
    description: "Solve premium crossword puzzles with multiplayer collaboration, progress tracking, and unlimited hints.",
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
  return (
    <html lang="en" suppressHydrationWarning>
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
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
