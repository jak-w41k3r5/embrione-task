'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GithubIcon, LinkedinIcon } from '@/components/Icons';
import { isSupabaseConfigured, PHOTO_BUCKET, supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import type { Member, MemberStatus } from '@/lib/types';
import { safeUrl } from '@/lib/utils';

// Credentials required by the task brief.
// NOTE: this is a client-side gate meant for the challenge. A real app would use
// Supabase Auth plus RLS policies that check the signed-in admin.
const ADMIN_EMAIL = 'admin@embrione.pes.edu';
const ADMIN_PASSWORD = 'EmbrioneAdmin@2026';
const SESSION_KEY = 'embrione_admin_session';

type Tab = 'pending' | 'approved' | 'rejected' | 'all';

export default function AdminPage() {
  // null = still checking sessionStorage (avoids a login-form flash after refresh)
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setAuthed(sessionStorage.getItem(SESSION_KEY) === '1');
    } catch {
      setAuthed(false);
    }
  }, []);

  if (authed === null) {
    return <p className="py-20 text-center text-zinc-500">Loading…</p>;
  }

  if (!authed) {
    return (
      <Login
        onSuccess={() => {
          try {
            sessionStorage.setItem(SESSION_KEY, '1');
          } catch {
            /* sessionStorage unavailable: stay logged in for this page view only */
          }
          setAuthed(true);
        }}
      />
    );
  }

  return (
    <Dashboard
      onLogout={() => {
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {
          /* ignore */
        }
        setAuthed(false);
      }}
    />
  );
}

/* ------------------------------ Login ------------------------------ */

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setError('');
      toast('success', 'Welcome back, admin.');
      onSuccess();
    } else {
      setError('Wrong email or password.');
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-md animate-fade-up">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/30 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Admin login</h1>
        <p className="mt-1 text-sm text-zinc-400">Sign in to review pending member profiles.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="label">Email</span>
            <input
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@embrione.pes.edu"
              autoComplete="username"
              required
            />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-rose-400">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full">
            Log in
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------- Dashboard ---------------------------- */

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast('error', `Could not load submissions: ${error.message}`);
    else setMembers((data ?? []) as Member[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      total: members.length,
      pending: members.filter((m) => m.status === 'pending').length,
      approved: members.filter((m) => m.status === 'approved').length,
      rejected: members.filter((m) => m.status === 'rejected').length,
    }),
    [members],
  );

  const visible = useMemo(
    () => (tab === 'all' ? members : members.filter((m) => m.status === tab)),
    [members, tab],
  );

  async function setStatus(m: Member, status: 'approved' | 'rejected') {
    setBusyId(m.id);
    const { data, error } = await supabase
      .from('members')
      .update({ status })
      .eq('id', m.id)
      .select('id');
    setBusyId(null);

    // RLS can block an update without an error, so also check that a row came back.
    if (error || !data || data.length === 0) {
      toast('error', error?.message ?? 'Update was blocked. Check the "Allow admin updates" policy.');
      return;
    }
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, status } : x)));
    toast(
      'success',
      status === 'approved' ? `${m.name} approved. They now show on /team.` : `${m.name} rejected.`,
    );
  }

  async function remove(m: Member) {
    if (!window.confirm(`Delete ${m.name}'s profile permanently?`)) return;

    setBusyId(m.id);
    const { data, error } = await supabase.from('members').delete().eq('id', m.id).select('id');
    setBusyId(null);

    if (error || !data || data.length === 0) {
      toast('error', error?.message ?? 'Delete was blocked. Check the "Allow admin deletes" policy.');
      return;
    }
    setMembers((prev) => prev.filter((x) => x.id !== m.id));
    toast('info', `${m.name} deleted.`);

    // Best effort: also remove the uploaded photo (seed avatars are not in our bucket, so skipped).
    const marker = `/${PHOTO_BUCKET}/`;
    const idx = m.photo_url.indexOf(marker);
    if (idx !== -1) {
      const path = decodeURIComponent(m.photo_url.slice(idx + marker.length).split('?')[0]);
      void supabase.storage.from(PHOTO_BUCKET).remove([path]);
    }
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
    { key: 'all', label: 'All', count: counts.total },
  ];

  return (
    <div className="animate-fade-up">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Moderation dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">Approve or reject member profiles.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} disabled={loading} className="btn-ghost !px-3 !py-2">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" onClick={onLogout} className="btn-ghost !px-3 !py-2">
            Log out
          </button>
        </div>
      </header>

      {!isSupabaseConfigured && (
        <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          Supabase keys are not set, so no data can be loaded.
        </div>
      )}

      <section aria-label="Counters" className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total submissions" value={counts.total} />
        <Stat label="Pending" value={counts.pending} tone="amber" />
        <Stat label="Approved" value={counts.approved} tone="emerald" />
        <Stat label="Rejected" value={counts.rejected} tone="rose" />
      </section>

      <div className="mb-5 flex gap-2 overflow-x-auto" role="tablist" aria-label="Filter by status">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`chip ${tab === t.key ? 'chip-active' : ''}`}
          >
            {t.label} <span className="ml-1 text-zinc-400">{t.count}</span>
          </button>
        ))}
      </div>

      {loading && members.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <p className="text-lg font-medium">
            {tab === 'pending' ? 'Nothing waiting for review 🎉' : 'No profiles here'}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {tab === 'pending'
              ? 'New submissions from /register will show up here.'
              : 'Try another tab.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((m) => (
            <AdminCard
              key={m.id}
              member={m}
              busy={busyId === m.id}
              onApprove={() => setStatus(m, 'approved')}
              onReject={() => setStatus(m, 'rejected')}
              onDelete={() => remove(m)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'indigo',
}: {
  label: string;
  value: number;
  tone?: 'indigo' | 'amber' | 'emerald' | 'rose';
}) {
  const tones = {
    indigo: 'text-indigo-300',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
    rose: 'text-rose-300',
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

const STATUS_STYLES: Record<MemberStatus, string> = {
  pending: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  approved: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  rejected: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
};

function AdminCard({
  member: m,
  busy,
  onApprove,
  onReject,
  onDelete,
}: {
  member: Member;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const linkedin = safeUrl(m.linkedin_url);
  const github = safeUrl(m.github_url);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={m.photo_url}
          alt={`${m.name}'s profile photo`}
          className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-white/10"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-lg font-semibold">{m.name}</h3>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[m.status]}`}
            >
              {m.status}
            </span>
          </div>
          <p className="truncate text-sm text-indigo-300">
            {m.domain} · {m.position}
          </p>
          <p className="truncate text-xs text-zinc-400">
            {m.branch} · Sem {m.semester} · {m.srn}
          </p>
          <p className="truncate text-xs text-zinc-500">{m.email}</p>
        </div>
      </div>

      {m.bio && <p className="line-clamp-3 break-words text-sm text-zinc-400">{m.bio}</p>}

      <div className="flex items-center gap-3 text-zinc-400">
        {linkedin && (
          <a href={linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-sky-300">
            <LinkedinIcon />
          </a>
        )}
        {github && (
          <a href={github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="hover:text-white">
            <GithubIcon />
          </a>
        )}
        <span className="ml-auto text-xs text-zinc-500">
          {new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        {m.status !== 'approved' && (
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="btn bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
          >
            Approve
          </button>
        )}
        {m.status !== 'rejected' && (
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="btn bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
          >
            Reject
          </button>
        )}
        <button type="button" disabled={busy} onClick={onDelete} className="btn-ghost ml-auto">
          Delete
        </button>
      </div>
    </article>
  );
}
