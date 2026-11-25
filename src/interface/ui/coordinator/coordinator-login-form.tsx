'use client';

import { useActionState } from 'react';
import type { LoginStatus } from '../../actions/coordinator-login';

interface LoginCopy {
  email: string;
  submit: string;
  invalid: string;
  sent: string;
  try_later: string;
}

export function CoordinatorLoginForm({
  action,
  locale,
  copy,
}: {
  action: (previous: LoginStatus, form: FormData) => Promise<LoginStatus>;
  locale: string;
  copy: LoginCopy;
}) {
  const [status, dispatch, isPending] = useActionState(action, 'idle');
  return (
    <form action={dispatch}>
      <input type="hidden" name="locale" value={locale} />
      <label>
        {copy.email} <input type="email" autoComplete="email" name="email" required />
      </label>
      <button type="submit" disabled={isPending}>
        {copy.submit}
      </button>
      {status !== 'idle' && <p role="status">{copy[status]}</p>}
    </form>
  );
}
