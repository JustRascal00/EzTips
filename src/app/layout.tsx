import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EZTips — Learn your games, one clip at a time",
    template: "%s · EZTips",
  },
  description:
    "A personalized feed of short gaming tips, mechanics, strategies, and guides uploaded by the community.",
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
