import { getTranslations } from 'next-intl/server';

export async function HomePage() {
  const translate = await getTranslations('common');
  return (
    <main>
      <h1>{translate('appName')}</h1>
    </main>
  );
}
