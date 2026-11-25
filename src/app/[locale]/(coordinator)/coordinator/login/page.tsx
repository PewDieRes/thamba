import { getLocale, getTranslations } from 'next-intl/server';
import { CoordinatorLoginForm } from '@ui/coordinator/coordinator-login-form';
import { signInCoordinator } from './actions';

export default async function CoordinatorLoginPage() {
  const t = await getTranslations('coordinator.login');
  return (
    <>
      <h1>{t('title')}</h1>
      <CoordinatorLoginForm
        action={signInCoordinator}
        locale={await getLocale()}
        copy={{
          email: t('email'),
          submit: t('submit'),
          invalid: t('invalid'),
          sent: t('sent'),
          try_later: t('try_later'),
        }}
      />
    </>
  );
}
