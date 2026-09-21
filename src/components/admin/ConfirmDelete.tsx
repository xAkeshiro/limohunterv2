'use client';

export default function ConfirmDelete({ label = 'Delete', title }: { label?: string; title: string }) {
  return (
    <button
      type="submit"
      className="text-xs font-semibold text-red-400 hover:text-red-300"
      onClick={(e) => {
        if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}
