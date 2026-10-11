'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/team', label: 'Team' },
  { href: '/register', label: 'Register' },
  { href: '/admin', label: 'Admin' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07070b]/80 backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/team" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-300" />
          The Embrione
        </Link>
        <ul className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
