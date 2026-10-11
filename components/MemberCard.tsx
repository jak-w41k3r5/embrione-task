import { GithubIcon, LinkedinIcon, UserIcon } from './Icons';
import { safeUrl } from '@/lib/utils';

type Props = {
  name?: string;
  domain?: string;
  position?: string;
  branch?: string;
  semester?: number | string;
  bio?: string | null;
  photoUrl?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  /** Preview mode (used on /register): shows placeholders and makes links non-clickable. */
  preview?: boolean;
};

const POSITION_STYLES: Record<string, string> = {
  Head: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  'Vice-Head': 'border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300',
  'Core Member': 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  Member: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-300',
};

const iconBtn =
  'flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition';

export default function MemberCard({
  name,
  domain,
  position,
  branch,
  semester,
  bio,
  photoUrl,
  linkedinUrl,
  githubUrl,
  preview = false,
}: Props) {
  const linkedin = safeUrl(linkedinUrl);
  const github = safeUrl(githubUrl);
  const metaParts = [branch, semester ? `Sem ${semester}` : ''].filter(Boolean);

  return (
    <article className="group relative flex h-full flex-col items-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 text-center shadow-lg shadow-black/30 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-indigo-400/40 hover:shadow-indigo-500/10">
      <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl transition group-hover:bg-cyan-400/25" />

      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={name ? `${name}'s profile photo` : 'Profile photo'}
          className="relative h-24 w-24 rounded-full object-cover ring-2 ring-indigo-400/40 transition group-hover:ring-cyan-300/60"
        />
      ) : (
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/5 text-zinc-500 ring-2 ring-white/10">
          <UserIcon className="h-12 w-12" />
        </div>
      )}

      <h3
        className={`relative mt-4 w-full truncate text-lg font-semibold ${
          name ? 'text-zinc-50' : 'text-zinc-600'
        }`}
      >
        {name || 'Your Name'}
      </h3>

      <span
        className={`relative mt-2 inline-block max-w-full truncate rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          position
            ? POSITION_STYLES[position] ?? POSITION_STYLES.Member
            : 'border-white/10 bg-white/5 text-zinc-600'
        }`}
      >
        {position || 'Position'}
      </span>

      <p
        className={`relative mt-2 w-full truncate text-sm ${
          domain ? 'text-indigo-300' : 'text-zinc-600'
        }`}
      >
        {domain || 'Domain'}
      </p>

      <p className="relative mt-0.5 text-xs text-zinc-400">
        {metaParts.length ? metaParts.join(' · ') : preview ? 'Branch · Sem' : ''}
      </p>

      <p
        className={`relative mt-3 line-clamp-3 w-full break-words text-sm leading-relaxed ${
          bio ? 'text-zinc-400' : 'text-zinc-600'
        }`}
      >
        {bio || (preview ? 'Your short bio will appear here as you type…' : '')}
      </p>

      <div className="relative mt-auto flex gap-3 pt-5">
        {preview ? (
          <>
            <span className={`${iconBtn} ${linkedin ? 'text-sky-300' : 'opacity-40'}`}>
              <LinkedinIcon />
            </span>
            <span className={`${iconBtn} ${github ? 'text-zinc-100' : 'opacity-40'}`}>
              <GithubIcon />
            </span>
          </>
        ) : (
          <>
            {linkedin && (
              <a
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name ?? 'Member'} on LinkedIn`}
                className={`${iconBtn} hover:border-sky-400/50 hover:text-sky-300`}
              >
                <LinkedinIcon />
              </a>
            )}
            {github && (
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name ?? 'Member'} on GitHub`}
                className={`${iconBtn} hover:border-white/40 hover:text-white`}
              >
                <GithubIcon />
              </a>
            )}
          </>
        )}
      </div>
    </article>
  );
}
