import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ProvaApp",
  description: "Crie e gerencie provas escolares",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${geist.className} min-h-full bg-slate-50 antialiased`}>
        {children}
      </body>
    </html>
  );
}
