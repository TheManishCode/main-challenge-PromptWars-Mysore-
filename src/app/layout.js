import './globals.css';
import { Fraunces, Plus_Jakarta_Sans, Caveat } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';

const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal'],
  variable: '--font-display',
  display: 'swap'
});

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap'
});

const hand = Caveat({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-hand',
  display: 'swap'
});

export const metadata = {
  title: 'MindTrail | A calmer way through exam season',
  description: 'A warm, private companion that helps high-stakes exam students notice how they feel, lower the pressure, and keep moving without burning out.'
};

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function RootLayout({ children }) {
  const fontVars = `${display.variable} ${sans.variable} ${hand.variable}`;
  const content = (
    <html lang="en" className={fontVars}>
      <body>{children}</body>
    </html>
  );

  if (!hasClerk) return content;

  return (
    <ClerkProvider>
      {content}
    </ClerkProvider>
  );
}
