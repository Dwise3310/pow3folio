import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./ui-polish.css";
import Pow3Bot from "@/components/ai/Pow3Bot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pow3Folio | Web3 Proof of Work Portfolio",
    template: "%s | Pow3Folio",
  },
  description:
    "The professional identity layer for crypto. Showcase your trading record, community work, writing and on chain proof in one clean link.",
  keywords: ["web3", "portfolio", "proof of work", "crypto", "trader portfolio"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pow3folio-theme');if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        {children}
        <Pow3Bot />
      </body>
    </html>
  );
}
