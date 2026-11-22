import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "T-Quest | Boston nights, better planned",
  description: "Pick your vibe, set your budget, and get a Boston night out planned along the T.",
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
