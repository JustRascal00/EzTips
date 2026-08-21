import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "EZTips — Learn your games, one clip at a time",
    template: "%s · EZTips",
  },
  description:
    "A personalized feed of short gaming tips, mechanics, strategies, and guides uploaded by the community.",
  openGraph: {
    title: "EZTips — Learn your games, one clip at a time",
    description: "Community gaming tips, personalized to your games.",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "EZTips — Discover the trick. Level up faster." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EZTips — Learn your games, one clip at a time",
    description: "Community gaming tips, personalized to your games.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-bg text-text font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
