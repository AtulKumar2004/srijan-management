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
  title: "Srijan Youth Festival",
  description: "Srijan Youth Festival Management System",
  icons: {
    icon: "/SrijanLogo4.png",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={quicksand.className} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <GlobalModalContainer />
        {children}
      </body>
    </html>
  );
}
