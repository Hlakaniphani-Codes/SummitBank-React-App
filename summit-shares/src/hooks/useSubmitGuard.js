import { useState } from 'react';

// Wraps an async form handler so a slow request (or an impatient double-click)
// can't fire it twice, and exposes a `submitting` flag for disabling the button.
// Errors are left to the wrapped handler to catch - this hook only tracks in-flight state.
export function useSubmitGuard(handler) {
  const [submitting, setSubmitting] = useState(false);

  const guardedHandler = async (e) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await handler(e);
    } finally {
      setSubmitting(false);
    }
  };

  return [submitting, guardedHandler];
}
