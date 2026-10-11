'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import MemberCard from '@/components/MemberCard';
import { BIO_MAX, BIO_MIN, BRANCHES, DOMAINS, POSITIONS, SEMESTERS } from '@/lib/constants';
import { convertToWebp, formatBytes } from '@/lib/image';
import { isSupabaseConfigured, PHOTO_BUCKET, supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { isUrlOnHost } from '@/lib/utils';

type FormState = {
  name: string;
  domain: string;
  position: string;
  srn: string;
  email: string;
  linkedin: string;
  github: string;
  branch: string;
  semester: string;
  bio: string;
};

const INITIAL: FormState = {
  name: '',
  domain: '',
  position: '',
  srn: '',
  email: '',
  linkedin: '',
  github: '',
  branch: '',
  semester: '',
  bio: '',
};

// e.g. PES1UG23CS001
const SRN_RE = /^PES\d[A-Z]{2}\d{2}[A-Z]{2,3}\d{3}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Photo = {
  blob: Blob; // the converted .webp file that will be uploaded
  previewUrl: string; // local blob: URL, used only for the live preview
  originalSize: number;
  fileName: string;
};

function validate(f: FormState, hasPhoto: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  const name = f.name.trim();
  if (name.length < 2) e.name = 'Enter your full name.';
  else if (name.length > 60) e.name = 'Keep your name under 60 characters.';

  if (!f.domain) e.domain = 'Pick a domain.';
  if (!f.position) e.position = 'Pick a position.';
  if (!f.branch) e.branch = 'Pick your branch.';
  if (!f.semester) e.semester = 'Pick your semester.';

  if (!SRN_RE.test(f.srn.trim().toUpperCase())) e.srn = 'Use the format PES1UG23CS001.';
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address.';

  if (f.linkedin.trim() && !isUrlOnHost(f.linkedin, 'linkedin.com'))
    e.linkedin = 'Use a full LinkedIn link, e.g. https://www.linkedin.com/in/your-name';
  if (f.github.trim() && !isUrlOnHost(f.github, 'github.com'))
    e.github = 'Use a full GitHub link, e.g. https://github.com/your-username';

  const bioLen = f.bio.trim().length;
  if (bioLen < BIO_MIN || bioLen > BIO_MAX)
    e.bio = `Write ${BIO_MIN}-${BIO_MAX} characters (currently ${bioLen}).`;

  if (!hasPhoto) e.photo = 'Add a profile picture.';
  return e;
}

function messageOf(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Something went wrong. Please try again.';
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-rose-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-zinc-500">{hint}</span>
      ) : null}
    </label>
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [converting, setConverting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [srnTaken, setSrnTaken] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Free the local preview URL when leaving the page.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const errors = useMemo(() => validate(form, Boolean(photo)), [form, photo]);
  const showError = (key: string) =>
    srnTaken && key === 'srn'
      ? 'This SRN has already been submitted.'
      : touched[key] || submitAttempted
        ? errors[key]
        : undefined;

  // Generic change handler: one function updates whichever field fired the event.
  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm((f) => ({ ...f, [key]: value }));
      if (key === 'srn') setSrnTaken(false);
    };

  const blur = (key: string) => () => setTouched((t) => ({ ...t, [key]: true }));

  async function isSrnTaken(value: string): Promise<boolean> {
    const srn = value.trim().toUpperCase();
    if (!SRN_RE.test(srn) || !isSupabaseConfigured) return false;
    const { data, error } = await supabase.from('members').select('id').eq('srn', srn).limit(1);
    if (error) return false; // can't tell here; the unique index in the database still protects us
    return (data?.length ?? 0) > 0;
  }

  async function onSrnBlur() {
    setTouched((t) => ({ ...t, srn: true }));
    if (await isSrnTaken(form.srn)) setSrnTaken(true);
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      toast('error', 'Please choose a .png, .jpg or .jpeg image.');
      input.value = '';
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast('error', 'That image is over 15 MB. Please pick a smaller one.');
      input.value = '';
      return;
    }

    setConverting(true);
    try {
      // Convert in the browser: max 800px wide, quality 0.8 -> small .webp
      const blob = await convertToWebp(file, { maxWidth: 800, quality: 0.8 });
      const url = URL.createObjectURL(blob);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      setPhoto({ blob, previewUrl: url, originalSize: file.size, fileName: file.name });
    } catch (err) {
      toast('error', messageOf(err));
      input.value = '';
    } finally {
      setConverting(false);
    }
  }

  function removePhoto() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function fillSample() {
    const suffix = String(Math.floor(100 + Math.random() * 900));
    setForm({
      name: 'Sample Student',
      domain: 'Web Development',
      position: 'Member',
      srn: `PES1UG23CS${suffix}`,
      email: 'sample.student@example.com',
      linkedin: 'https://www.linkedin.com/in/sample-student',
      github: 'https://github.com/sample-student',
      branch: 'CSE',
      semester: '3',
      bio: 'Curious builder who enjoys turning ideas into clean, fast web apps. Always learning new tools, breaking things on purpose and shipping small improvements with the team.',
    });
    setSrnTaken(false);
  }

  function resetAll() {
    removePhoto();
    setForm(INITIAL);
    setTouched({});
    setSubmitAttempted(false);
    setSrnTaken(false);
    setSubmitted(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);

    if (Object.keys(errors).length > 0 || !photo) {
      toast('error', 'Please fix the highlighted fields first.');
      return;
    }
    if (!isSupabaseConfigured) {
      toast('error', 'Supabase keys are missing. Check your environment variables.');
      return;
    }

    setSubmitting(true);
    try {
      const srn = form.srn.trim().toUpperCase();

      // 1) Friendly duplicate check before we upload anything.
      if (await isSrnTaken(srn)) {
        setSrnTaken(true);
        toast('error', 'This SRN has already been submitted.');
        return;
      }

      // 2) Only now (on submit) upload the already-converted .webp to Storage.
      const path = `${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, photo.blob, { contentType: 'image/webp', cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

      // 3) Save the profile as 'pending' so an admin can review it.
      const { error: insertError } = await supabase.from('members').insert({
        name: form.name.trim(),
        domain: form.domain,
        position: form.position,
        srn,
        email: form.email.trim(),
        linkedin_url: form.linkedin.trim() || null,
        github_url: form.github.trim() || null,
        branch: form.branch,
        semester: Number(form.semester),
        bio: form.bio.trim(),
        photo_url: pub.publicUrl,
        status: 'pending',
      });

      if (insertError) {
        await supabase.storage.from(PHOTO_BUCKET).remove([path]); // don't leave an orphan photo behind
        if (insertError.code === '23505') {
          setSrnTaken(true);
          toast('error', 'This SRN has already been submitted.');
          return;
        }
        throw insertError;
      }

      toast('success', "You're in! Your profile was submitted and is waiting for admin approval.");
      setSubmitted(true);
    } catch (err) {
      toast('error', messageOf(err));
    } finally {
      setSubmitting(false);
    }
  }

  const bioLen = form.bio.length;
  const bioOk = bioLen >= BIO_MIN && bioLen <= BIO_MAX;

  return (
    <div className="animate-fade-up">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Join the team</h1>
        <p className="mt-2 text-zinc-400">
          Fill in your details and watch your member card update live. An admin reviews every
          submission before it appears on the team page.
        </p>
      </header>

      {!isSupabaseConfigured && (
        <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          Supabase keys are not set yet, so submitting is disabled. Add{' '}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---------- Form ---------- */}
        {submitted ? (
          <section className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-8">
            <h2 className="text-2xl font-semibold text-emerald-100">Submitted! 🎉</h2>
            <p className="mt-2 text-emerald-100/80">
              Your profile is now <strong>pending</strong>. Once an admin approves it, it will show
              up on the team page.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/team" className="btn-primary">
                View team page
              </Link>
              <button type="button" onClick={resetAll} className="btn-ghost">
                Submit another profile
              </button>
            </div>
          </section>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your details</h2>
              <button type="button" onClick={fillSample} className="btn-ghost !px-3 !py-1.5 !text-xs">
                Fill sample data
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" error={showError('name')}>
                <input
                  className="field"
                  value={form.name}
                  onChange={set('name')}
                  onBlur={blur('name')}
                  placeholder="Aarav Mehta"
                  maxLength={80}
                  autoComplete="name"
                />
              </Field>

              <Field label="SRN" error={showError('srn')} hint="e.g. PES1UG23CS001">
                <input
                  className="field uppercase"
                  value={form.srn}
                  onChange={set('srn')}
                  onBlur={onSrnBlur}
                  placeholder="PES1UG23CS001"
                  maxLength={20}
                  autoCapitalize="characters"
                />
              </Field>

              <Field label="Domain" error={showError('domain')}>
                <select className="field" value={form.domain} onChange={set('domain')} onBlur={blur('domain')}>
                  <option value="">Select domain</option>
                  {DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Position" error={showError('position')}>
                <select className="field" value={form.position} onChange={set('position')} onBlur={blur('position')}>
                  <option value="">Select position</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Branch" error={showError('branch')}>
                <select className="field" value={form.branch} onChange={set('branch')} onBlur={blur('branch')}>
                  <option value="">Select branch</option>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Semester" error={showError('semester')}>
                <select className="field" value={form.semester} onChange={set('semester')} onBlur={blur('semester')}>
                  <option value="">Select semester</option>
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="sm:col-span-2">
                <Field label="Email" error={showError('email')} hint="PES email or personal email">
                  <input
                    type="email"
                    className="field"
                    value={form.email}
                    onChange={set('email')}
                    onBlur={blur('email')}
                    placeholder="you@pes.edu"
                    autoComplete="email"
                  />
                </Field>
              </div>

              <Field label="LinkedIn URL" error={showError('linkedin')} hint="Optional">
                <input
                  className="field"
                  value={form.linkedin}
                  onChange={set('linkedin')}
                  onBlur={blur('linkedin')}
                  placeholder="https://www.linkedin.com/in/…"
                  inputMode="url"
                />
              </Field>

              <Field label="GitHub URL" error={showError('github')} hint="Optional">
                <input
                  className="field"
                  value={form.github}
                  onChange={set('github')}
                  onBlur={blur('github')}
                  placeholder="https://github.com/…"
                  inputMode="url"
                />
              </Field>
            </div>

            <div>
              <div className="flex items-end justify-between">
                <span className="label !mb-0">Short bio</span>
                <span className={`text-xs ${bioOk ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {bioLen}/{BIO_MAX}
                </span>
              </div>
              <textarea
                className="field mt-1.5 min-h-[110px] resize-y"
                value={form.bio}
                onChange={set('bio')}
                onBlur={blur('bio')}
                maxLength={BIO_MAX}
                placeholder={`Tell us about yourself in ${BIO_MIN}-${BIO_MAX} characters`}
              />
              {showError('bio') && <p className="mt-1 text-xs text-rose-400">{showError('bio')}</p>}
            </div>

            <div>
              <span className="label">Profile picture</span>
              <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-4">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onFileChange}
                  className="block w-full text-sm text-zinc-400 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-100 hover:file:bg-indigo-500/30"
                />
                <p className="mt-2 text-xs text-zinc-500" aria-live="polite">
                  {converting
                    ? 'Converting to WebP…'
                    : photo
                      ? `Converted to WebP: ${formatBytes(photo.originalSize)} → ${formatBytes(photo.blob.size)} (${photo.fileName})`
                      : 'PNG or JPG. It is converted to WebP in your browser and uploaded when you submit.'}
                </p>
                {photo && (
                  <button type="button" onClick={removePhoto} className="mt-2 text-xs text-zinc-400 underline hover:text-zinc-200">
                    Remove photo
                  </button>
                )}
              </div>
              {showError('photo') && <p className="mt-1 text-xs text-rose-400">{showError('photo')}</p>}
            </div>

            <button type="submit" disabled={submitting || converting} className="btn-primary w-full sm:w-auto">
              {submitting ? 'Submitting…' : 'Submit for approval'}
            </button>
          </form>
        )}

        {/* ---------- Live preview ---------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="label">Live preview</p>
          <div className="mx-auto max-w-sm lg:max-w-none">
            <MemberCard
              preview
              name={form.name.trim()}
              domain={form.domain}
              position={form.position}
              branch={form.branch}
              semester={form.semester}
              bio={form.bio.trim()}
              photoUrl={photo?.previewUrl}
              linkedinUrl={form.linkedin}
              githubUrl={form.github}
            />
          </div>
          <p className="mt-3 text-center text-xs text-zinc-500">
            This is how your card will look on the team page.
          </p>
        </aside>
      </div>
    </div>
  );
}
