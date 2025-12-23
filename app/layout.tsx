import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monitoring Dashboard",
  description: "Dashboard pour surveiller vos serveurs MVPS et OneProvider",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
