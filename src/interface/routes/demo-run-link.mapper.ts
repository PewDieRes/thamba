import { z } from 'zod';
import type { DemoRun } from './rider-booking.commands';

const runLink = z.object({
  run: z.uuid(),
  stand: z.uuid(),
  template: z.guid(),
});

export function mapDemoRunLink(query: unknown) {
  const parsed = runLink.safeParse(query);
  return parsed.success
    ? {
        demoRunId: parsed.data.run,
        standId: parsed.data.stand,
        templateStandId: parsed.data.template,
      }
    : undefined;
}

export function buildDemoRunLink(href: string, run: DemoRun, templateStandId: string) {
  const [path = href, query] = href.split('?');
  const params = new URLSearchParams(query);
  params.set('run', run.demoRunId);
  params.set('stand', run.standId);
  params.set('template', templateStandId);
  return `${path}?${params.toString()}`;
}
