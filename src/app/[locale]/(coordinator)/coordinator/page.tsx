import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function CoordinatorPage() {
  const t = await getTranslations('coordinator.login');
  return (
    <main>
      <h1>{t('signedIn')}</h1>
    </main>
  );
}
