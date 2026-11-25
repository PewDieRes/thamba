import type { LandmarkId } from '@domain/shared/ids.value-object';
import type { CatalogueLandmark } from '../contracts/town-overview-view';

export function mapDriverLandmark(
  landmarks: readonly CatalogueLandmark[] | undefined,
  id: LandmarkId,
) {
  const landmark = landmarks?.find((item) => item.id === id);
  return landmark ? { name: landmark.name, names: landmark.names } : null;
}
