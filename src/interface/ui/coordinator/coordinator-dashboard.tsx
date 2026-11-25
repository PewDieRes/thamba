'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { CoordinatorDashboardView } from '@application/contracts/coordinator-dashboard-view';
import type { Locale } from '@application/contracts/town-overview-view';
import { localizeText } from '../../routes/rider-display.mapper';
import { BookingTables } from './booking-tables';
import type { CoordinatorCopy } from './coordinator-copy';
import { DriverRoster } from './driver-roster';
import { QueueHistory } from './queue-history';

const POLL_INTERVAL_MILLISECONDS = 5_000;

interface DashboardProps {
  dashboard: CoordinatorDashboardView;
  standIds: readonly string[];
  locale: Locale;
  copy: CoordinatorCopy;
}

export function CoordinatorDashboard({ dashboard, standIds, locale, copy }: DashboardProps) {
  const refresh = useDashboardRefresh();
  const { stand, drivers, history } = dashboard;
  const standName = localizeText(locale, stand.name, stand.names);
  const names = new Map(
    drivers.map((driver) => [driver.driverId, localizeText(locale, driver.name, driver.names)]),
  );
  return (
    <div className="coordinator-dashboard">
      <header>
        <h1>{copy.title}</h1>
        <p>{standName}</p>
      </header>
      <StandNavigation
        standIds={standIds}
        active={stand.id}
        standName={standName}
        label={copy.stands}
      />
      <DriverRoster
        drivers={drivers}
        names={names}
        standId={stand.id}
        locale={locale}
        copy={copy}
        onChange={refresh}
      />
      <QueueHistory history={history} names={names} locale={locale} copy={copy} />
      <BookingTables dashboard={dashboard} locale={locale} copy={copy} />
    </div>
  );
}

function StandNavigation({
  standIds,
  active,
  standName,
  label,
}: {
  standIds: readonly string[];
  active: string;
  standName: string;
  label: string;
}) {
  if (standIds.length < 2) return null;
  return (
    <nav aria-label={label}>
      <ul>
        {standIds.map((id) => (
          <li key={id}>
            <a aria-current={id === active ? 'page' : undefined} href={`?stand=${id}`}>
              {id === active ? standName : id}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function useDashboardRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, POLL_INTERVAL_MILLISECONDS);
    return () => {
      window.clearInterval(timer);
    };
  }, [router]);
  return () => {
    router.refresh();
  };
}
