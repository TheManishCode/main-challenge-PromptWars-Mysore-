import './globals.css';
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

export const metadata = {
  title: 'MindTrail | PromptWars',
  description: 'AI-powered mental wellness tracker for high-stakes exam preparation.'
};

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function AuthHeader() {
  if (!hasClerk) return null;
  return (
    <header className="auth-header">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button">Sign in</button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className="secondary-button">Sign up</button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </header>
  );
}

export default function RootLayout({ children }) {
  const content = (
    <html lang="en">
      <body>
        <AuthHeader />
        {children}
      </body>
    </html>
  );

  if (!hasClerk) return content;

  return (
    <ClerkProvider>
      {content}
    </ClerkProvider>
  );
}
