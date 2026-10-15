import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Incidencias RSA",
  description: "Gestión de incidencias — Residencial Santa Aurelia",
  icons: { icon: { url: "/ico.png", type: "image/png" }, apple: "/ico.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
