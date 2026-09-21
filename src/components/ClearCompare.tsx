'use client';

import { useRouter } from 'next/navigation';
import { useCompare } from './CompareBar';

export default function ClearCompare() {
  const router = useRouter();
  const { clear } = useCompare();

  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={() => {
        clear();
        router.push('/compare');
      }}
    >
      Clear comparison
    </button>
  );
}
