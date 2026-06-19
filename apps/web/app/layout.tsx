import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codara Eyes",
  description: "Plataforma de analise preditiva de atencao visual para UX.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
