import type { MatchedRiderContactReader } from '@application/ports/matched-rider-contact-reader';
import type { Sql } from 'postgres';
import type { Database } from './database.types';
import { UNAVAILABLE } from './repository-storage';

type ContactRows = Database['public']['Functions']['thamba_get_matched_rider_contact']['Returns'];

export class PostgresMatchedRiderContactReader implements MatchedRiderContactReader {
  constructor(private readonly connect: () => Sql) {}

  async get({ bookingId, subject }: Parameters<MatchedRiderContactReader['get']>[0]) {
    try {
      const [row] = await this.connect()<ContactRows>`
        select * from public.thamba_get_matched_rider_contact(${bookingId}, ${subject})
      `;
      const value = row && {
        phone: row.phone_e164,
        ...(row.first_name ? { firstName: row.first_name } : {}),
      };
      return { ok: true as const, value: value ?? null };
    } catch {
      return UNAVAILABLE;
    }
  }
}
