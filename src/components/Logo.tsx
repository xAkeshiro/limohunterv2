export default function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
        <rect width="32" height="32" rx="8" fill="#e6bf57" />
        <path
          d="M5 20.5h2.2q.9-3.4 3.9-3.6h9.1q2.6.2 3.6 3.6H27v2.2q0 .7-.7.7h-1.1a2.6 2.6 0 0 1-5.1 0h-7.5a2.6 2.6 0 0 1-5.1 0H5.9q-.9 0-.9-.9Z"
          fill="#0e1116"
        />
        <path d="M11.4 14.4h9.4q1.4 0 2 1.2h-13q.6-1.2 1.6-1.2Z" fill="#0e1116" opacity=".55" />
      </svg>
      <span className="text-lg font-bold tracking-tight text-white">
        Limo<span className="text-brand-300">Hunter</span>
      </span>
    </span>
  );
}
