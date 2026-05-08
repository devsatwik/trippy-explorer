import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trippy AI Explorer | Smart Day Planner",
  description: "AI-powered travel assistant that plans your perfect day. Uses Google Maps, Places, and Geocoding APIs to curate real-time itineraries based on your interests and location.",
  keywords: ["travel planner", "day planner", "Google Maps", "itinerary", "smart assistant"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-link" aria-label="Skip to main content">Skip to content</a>
        <main id="main-content" role="main">{children}</main>
      </body>
    </html>
  );
}
