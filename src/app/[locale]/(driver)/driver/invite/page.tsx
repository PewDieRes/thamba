import { getTranslations } from 'next-intl/server';
import { ConfirmInvite } from '@ui/driver/confirm-invite';

export default async function DriverInvitePage() {
  const t = await getTranslations('driver.invite');
  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('instructions')}</p>
      <ConfirmInvite
        copy={{
          confirm: t('confirm'),
          confirmed: t('confirmed'),
          failed: t('failed'),
          missing: t('missing'),
        }}
      />
    </main>
  );
}
