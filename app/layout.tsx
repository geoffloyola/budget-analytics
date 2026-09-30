import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

// IBM Plex loads via a Google Fonts <link> rather than next/font/google, which
// fetches at build time and fails in network-restricted builds.
export const metadata: Metadata = {
  title: "National Budget Analytics",
  description: "Budget analysis and insights for the Office of the Representative.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Oswald:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
