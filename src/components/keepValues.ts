import { startTransition, useEffect, useRef, type FormEvent } from 'react';

/**
 * Submit handler for forms driven by `useActionState`.
 *
 * With `<form action={...}>`, React 19 clears every field once the action
 * finishes, so a submission the server rejects (a missing field, a wrong
 * password) wipes whatever the person typed. Dispatching from onSubmit
 * instead keeps their input on screen next to the error.
 */
export function keepValues(dispatch: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(data));
  };
}

/** Clears the form after a successful submission (e.g. password fields). */
export function useResetOnSuccess(state: { ok: boolean }) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}
