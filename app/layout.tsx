import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "T-Quest: your night out, routed by the T",
  description: "Tell us your budget, crew, and vibe. We build the quest. You ride the T.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
