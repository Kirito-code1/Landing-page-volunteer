import type { Metadata } from "next";
import "./globals.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

// Disable automatic CSS insertion because styles are imported manually above.
config.autoAddCss = false;

export const metadata: Metadata = {
  title: "VolunteerHub",
  description: "Сайт для тех кто хочет улучшить мир",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="antialiased">
        <LanguageProvider>
          <Navbar />
          {children}
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
