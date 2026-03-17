import type { Metadata } from "next";
import { Nunito, Geist_Mono, JetBrains_Mono, Fredoka } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Taro — Managed OpenClaw Hosting with Mission Control",
  description:
    "Deploy your AI agent in 30 seconds. The only managed OpenClaw platform with built-in mission control — agent boards, approval workflows, and real-time monitoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${nunito.variable} ${fredoka.variable} ${geistMono.variable} ${jetbrainsMono.variable} antialiased noise-bg`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
