import './globals.css';
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

export const metadata = {
  title: 'MindTrail | PromptWars',
  description: 'AI-powered mental wellness tracker for high-stakes exam preparation.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
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
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
