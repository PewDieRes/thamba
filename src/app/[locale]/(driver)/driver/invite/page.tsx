import { getTranslations } from 'next-intl/server';
import { ConfirmInvite } from '@ui/driver/confirm-invite';

export default async function DriverInvitePage({ params }: PageProps<'/[locale]/driver/invite'>) {
  const { locale } = await params;
  const home = await getTranslations('driver.home');
  const t = await getTranslations('driver.invite');
  return (
    <div className="driver">
      <h1>{t('title')}</h1>
      <p>{t('instructions')}</p>
      <ConfirmInvite
        homeHref={`/${locale}/driver`}
        copy={{
          confirm: t('confirm'),
          confirmed: t('confirmed'),
          failed: t('failed'),
          missing: t('missing'),
          openHome: home('openHome'),
        }}
      />
    </div>
  );
}
