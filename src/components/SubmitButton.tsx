'use client';

import { useFormStatus } from 'react-dom';

/** Submit button that disables itself while its form is posting. */
export default function SubmitButton({
  children,
  pendingText,
  className = 'btn-primary',
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
