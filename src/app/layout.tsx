import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Limpador de Extratos PDF — Remoção de Marcas d\'Água & OCR',
  description: 'Remova marcas d\'água de extratos bancários (Banco do Brasil, etc.) e converta em PDF editável e pesquisável para importar no seu sistema.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
