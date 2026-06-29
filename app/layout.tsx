import { Quicksand } from 'next/font/google'
import type { Metadata } from "next";
import "./globals.css";
import GlobalModalContainer from '@/components/GlobalModalContainer';

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Srijan Temple Management",
  description: "Temple management system",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={quicksand.className}>
      <body>
        <GlobalModalContainer />
        {children}
      </body>
    </html>
  );
}
