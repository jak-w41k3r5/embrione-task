import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import ToastHost from '@/components/ToastHost';

export const metadata: Metadata = {
  title: 'Meet The Team · The Embrione',
  description:
    'Register as a member, get approved by the admins and show up on the Embrione team directory.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-zinc-100 antialiased">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(60%_45%_at_50%_0%,rgba(99,102,241,0.18),transparent)]"
        />
        <Nav />
        <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <ToastHost />
      </body>
    </html>
  );
}
