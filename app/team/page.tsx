'use client';

import { useEffect, useMemo, useState } from 'react';
import MemberCard from '@/components/MemberCard';
import { DOMAINS, POSITIONS } from '@/lib/constants';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Member } from '@/lib/types';
import { positionRank } from '@/lib/utils';

const ALL = 'All';

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`chip ${active ? 'chip-active' : ''}`}
    >
      {children}
    </button>
  );
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domain, setDomain] = useState<string>(ALL);
  const [position, setPosition] = useState<string>(ALL);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Public page: only profiles the admin has approved are ever requested.
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      if (cancelled) return;
      if (error) setError(error.message);
      else setMembers((data ?? []) as Member[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () =>
      members
        .filter((m) => domain === ALL || m.domain === domain)
        .filter((m) => position === ALL || m.position === position)
        .sort(
          (a, b) =>
            positionRank(a.position) - positionRank(b.position) ||
            a.name.localeCompare(b.name),
        ),
    [members, domain, position],
  );

  const filtersActive = domain !== ALL || position !== ALL;

  return (
    <div className="animate-fade-up">
      <header className="mb-8 max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-widest text-indigo-300">
          The Embrione · PES University
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          Meet the{' '}
          <span className="bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent">
            team
          </span>
        </h1>
        <p className="mt-3 text-zinc-400">
          The people behind the events, the designs and the code. Only profiles approved by the
          admins show up here.
        </p>
      </header>

      {!isSupabaseConfigured && (
        <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          Supabase keys are not set yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (in <code>.env.local</code> locally, or in
          Vercel&apos;s environment variables) and reload.
        </div>
      )}

      <section aria-label="Filters" className="mb-8 space-y-4">
        <div>
          <p className="label">Domain</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <Chip active={domain === ALL} onClick={() => setDomain(ALL)}>
              All
            </Chip>
            {DOMAINS.map((d) => (
              <Chip key={d} active={domain === d} onClick={() => setDomain(d)}>
                {d}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="label">Position</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <Chip active={position === ALL} onClick={() => setPosition(ALL)}>
              All
            </Chip>
            {POSITIONS.map((p) => (
              <Chip key={p} active={position === p} onClick={() => setPosition(p)}>
                {p}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      {!loading && !error && (
        <p className="mb-4 text-sm text-zinc-500">
          Showing {visible.length} of {members.length} member{members.length === 1 ? '' : 's'}
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
          Could not load the team: {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : visible.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((m) => (
            <MemberCard
              key={m.id}
              name={m.name}
              domain={m.domain}
              position={m.position}
              branch={m.branch}
              semester={m.semester}
              bio={m.bio}
              photoUrl={m.photo_url}
              linkedinUrl={m.linkedin_url}
              githubUrl={m.github_url}
            />
          ))}
        </div>
      ) : (
        !error && (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
            <p className="text-lg font-medium">
              {filtersActive ? 'No members match these filters' : 'No approved members yet'}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {filtersActive
                ? 'Try a different domain or position.'
                : 'Check back after the admins approve some profiles.'}
            </p>
            {filtersActive && (
              <button
                type="button"
                className="btn-ghost mt-5"
                onClick={() => {
                  setDomain(ALL);
                  setPosition(ALL);
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
