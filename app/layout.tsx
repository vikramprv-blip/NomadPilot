import type { Metadata } from 'next';
import '@/styles/globals.css';
import CookieBanner from '@/components/cookies/CookieBanner';

export const metadata: Metadata = {
  title: 'NomadPilot — Autonomous AI Travel',
  description: 'AI-powered travel platform that plans, books, and manages your trips autonomously.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
