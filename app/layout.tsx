import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import ChunkLoadRecovery from "@/components/system/ChunkLoadRecovery";

// Disable automatic CSS insertion because styles are imported manually above.
config.autoAddCss = false;

export const metadata: Metadata = {
  title: "VolunteerHub",
  description: "Сайт для тех кто хочет улучшить мир",
};

const chunkRecoveryScript = `
(() => {
  const STORAGE_KEY = "volohero-chunk-reload";
  const RETRY_WINDOW_MS = 15000;
  const pattern = /ChunkLoadError|Loading chunk [^ ]+ failed|Failed to fetch dynamically imported module/i;

  const shouldReload = () => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return true;
      const lastReloadAt = Number.parseInt(raw, 10);
      if (!Number.isFinite(lastReloadAt)) return true;
      return Date.now() - lastReloadAt > RETRY_WINDOW_MS;
    } catch {
      return true;
    }
  };

  const reloadOnce = () => {
    if (!shouldReload()) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
    window.location.reload();
  };

  window.addEventListener("error", (event) => {
    const message = event.message || (event.error && event.error.message) || "";
    if (message && pattern.test(message)) {
      reloadOnce();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      typeof reason === "string"
        ? reason
        : reason && typeof reason.message === "string"
          ? reason.message
          : "";
    if (message && pattern.test(message)) {
      reloadOnce();
    }
  });
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script id="chunk-recovery-inline" strategy="beforeInteractive">
          {chunkRecoveryScript}
        </Script>
      </head>
      <body suppressHydrationWarning className="antialiased">
        <LanguageProvider>
          <ChunkLoadRecovery />
          <Navbar />
          {children}
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
