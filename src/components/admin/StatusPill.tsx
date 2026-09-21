const TONES: Record<string, string> = {
  published: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  draft: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
};

export default function StatusPill({ status }: { status: string }) {
  const tone = TONES[status] ?? 'border-slate-500/40 bg-slate-500/10 text-slate-400';

  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize ${tone}`}>
      {status}
    </span>
  );
}
