import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata = {
  title: 'MindTrail | PromptWars',
  description: 'AI-powered mental wellness tracker for high-stakes exam preparation.'
};

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function RootLayout({ children }) {
  const content = (
    <html lang="en">
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
