import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css?v=2";



const manrope = Manrope({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Stopboncos - Pencatatan Keuangan Pribadi",
  description: "Aplikasi pencatatan keuangan pribadi dengan sistem target kuota",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`h-full antialiased`}
      suppressHydrationWarning
    >
      <body className={`${manrope.className} min-h-full flex flex-col`} >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}