import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata():Promise<Metadata> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: { default: "Nexora — Digital tools for ambitious work", template: "%s · Nexora" },
    description: "Premium software, templates, courses, and creative assets. Buy once, download instantly, build better.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Nexora — Digital tools for ambitious work",
      description: "Curated digital products with secure checkout and instant delivery.",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1733, height: 907, alt: "Nexora — Make your next thing remarkable." }],
    },
    twitter: { card: "summary_large_image", images: [`${origin}/og.png`] },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
