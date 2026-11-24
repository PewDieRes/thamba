const MILLISECONDS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

const kolkataClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function getKolkataMinuteOfDay(epochMilliseconds: number): number | undefined {
  const seconds = getKolkataSecondOfDay(epochMilliseconds);
  return seconds === undefined ? undefined : Math.floor(seconds / SECONDS_PER_MINUTE);
}

export function getKolkataMidnight(utcMidnightMilliseconds: number): number | undefined {
  const seconds = getKolkataSecondOfDay(utcMidnightMilliseconds);
  if (seconds === undefined) return undefined;
  // Midnight UTC falls later on the same Kolkata date, even for historical offsets.
  const midnight = utcMidnightMilliseconds - seconds * MILLISECONDS_PER_SECOND;
  return getKolkataSecondOfDay(midnight) === 0 ? midnight : undefined;
}

function getKolkataSecondOfDay(epochMilliseconds: number): number | undefined {
  const date = new Date(epochMilliseconds);
  if (Number.isNaN(date.getTime())) return undefined;
  const [hour, minute, second] = kolkataClock.format(date).split(':');
  return (Number(hour) * MINUTES_PER_HOUR + Number(minute)) * SECONDS_PER_MINUTE + Number(second);
}
