import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trippy AI Explorer",
  description: "Dynamic Travel Planning & Experience Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
