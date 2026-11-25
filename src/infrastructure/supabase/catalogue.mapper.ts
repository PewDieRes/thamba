import type {
  CatalogueLandmark,
  CatalogueStand,
  Translations,
} from '@application/ports/town-repository';
import type { Json } from './database.types';

interface NameRow {
  id: string;
  name: string;
  name_translations: Json;
}

export interface CatalogueLandmarkRow extends NameRow {
  slug: string;
  is_illustrative: boolean;
}

export interface CatalogueStandRow extends NameRow {
  coordinator_contact: string;
  coordinator_contact_translations: Json;
  pickup_landmark_ids: string[];
}

export function readTranslations(value: Json | undefined): Translations {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value).filter(
    ([locale, text]) => ['mr', 'hi', 'en'].includes(locale) && typeof text === 'string',
  );
  return Object.fromEntries(entries);
}

export function readLandmark(row: CatalogueLandmarkRow): CatalogueLandmark {
  return {
    id: row.id as CatalogueLandmark['id'],
    slug: row.slug,
    name: row.name,
    names: readTranslations(row.name_translations),
    isIllustrative: row.is_illustrative,
  };
}

export function readCatalogueStand(row: CatalogueStandRow): CatalogueStand {
  return {
    id: row.id as CatalogueStand['id'],
    name: row.name,
    names: readTranslations(row.name_translations),
    coordinatorContact: row.coordinator_contact,
    coordinatorContacts: readTranslations(row.coordinator_contact_translations),
    pickupLandmarkIds: row.pickup_landmark_ids.map(
      (id) => id as CatalogueStand['pickupLandmarkIds'][number],
    ),
  };
}
