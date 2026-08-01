import type { Metadata, Viewport } from 'next';
import { Zen_Kaku_Gothic_New, DM_Mono } from 'next/font/google';
import './globals.css';

const zen = Zen_Kaku_Gothic_New({
  subsets: ['latin'],
  weight: ['300', '500'],
  variable: '--font-zen',
  display: 'swap',
});

const mono = DM_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PartySwoop',
  description: 'Party supply and drink request management made easy',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${zen.variable} ${mono.variable}`}>
      <body className={`${zen.className} min-h-screen bg-paper text-ink`}>
        {children}
      </body>
    </html>
  );
}
